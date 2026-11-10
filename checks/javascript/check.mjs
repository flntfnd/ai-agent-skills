// Checks every JavaScript sample in the skills, and the motion tokens the CSS samples use.
// Samples are pulled out of the markdown at run time. Packages come from this folder's lockfile.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const repo = option("--repo");
const build = option("--build");
if (!repo || !build) {
    console.error("usage: check.mjs --repo <repo root> --build <dir> [--self-test]");
    process.exit(2);
}

const exceptions = JSON.parse(readFileSync(join(here, "exceptions.json"), "utf8"));
const pins = JSON.parse(readFileSync(join(here, "package.json"), "utf8"));

// three, gsap and lenis touch a few browser globals when they load.
globalThis.self ??= globalThis;
globalThis.window ??= globalThis;
globalThis.document ??= { createElement: () => ({ style: {} }), documentElement: { style: {} } };

function markdownFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
        else if (entry.endsWith(".md")) out.push(full);
    }
    return out.sort();
}

function fences(text, languages) {
    const out = [];
    const pattern = /^```([A-Za-z0-9+-]*)[^\n]*\n([\s\S]*?)^```/gm;
    let match;
    while ((match = pattern.exec(text))) {
        if (languages.includes(match[1])) {
            out.push({ lang: match[1], body: match[2], line: text.slice(0, match.index).split("\n").length });
        }
    }
    return out;
}

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Step response of a damped spring: mass 1, natural frequency w0, damping ratio z.
function springAt(t, w0, z) {
    if (z < 1) {
        const wd = w0 * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

async function run(skillsRoot, repoRoot, outDir) {
    const failures = [];
    const counts = {};
    const fail = (message) => failures.push(message);
    const count = (key, n = 1) => (counts[key] = (counts[key] ?? 0) + n);
    const rel = (path) => relative(repoRoot, path);
    const allowed = (list, file, value) => exceptions[list].some((e) => e.file === file && (e.match === undefined || value.includes(e.match)));

    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const files = markdownFiles(skillsRoot);
    const moduleCache = new Map();
    const load = async (specifier) => {
        if (!moduleCache.has(specifier)) {
            moduleCache.set(
                specifier,
                await import(specifier).then(
                    (namespace) => ({ namespace }),
                    (error) => ({ error })
                )
            );
        }
        return moduleCache.get(specifier);
    };

    // 1 and 2. Parse every sample, then check what it imports.
    for (const path of files) {
        const text = readFileSync(path, "utf8");
        const samples = fences(text, ["js", "javascript", "jsx"]);
        const namespaces = new Map();
        const namespaceUses = [];

        for (const [index, sample] of samples.entries()) {
            const where = `${rel(path)}:${sample.line}`;
            const isJsx = sample.lang === "jsx";
            const outFile = join(outDir, `${rel(path).replace(/[\\/]/g, "__").replace(/\.md$/, "")}-${index}.${isJsx ? "jsx" : "mjs"}`);
            writeFileSync(outFile, sample.body);
            count("samples");

            let parseError = null;
            if (isJsx) {
                try {
                    transformSync(sample.body, { loader: "jsx", format: "esm", logLevel: "silent" });
                } catch (error) {
                    parseError = error.errors?.[0]?.text ?? String(error.message);
                }
            } else {
                const result = spawnSync(process.execPath, ["--check", outFile], { encoding: "utf8" });
                if (result.status !== 0) parseError = (result.stderr.split("\n").find((line) => /Error/.test(line)) ?? "syntax error").trim();
            }
            if (parseError) {
                if (!allowed("unparsed", rel(path), sample.body)) fail(`${where}: doesn't parse: ${parseError}`);
                continue;
            }

            const importPattern = /import\s+(?:([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+([A-Za-z_$][\w$]*))?\s*(?:from\s*)?["']([^"']+)["']/g;
            let match;
            while ((match = importPattern.exec(sample.body))) {
                const [, defaultName, named, namespaceName, specifier] = match;
                if (specifier.startsWith(".") || specifier.startsWith("/") || /^[a-z]+:/.test(specifier)) continue;
                count("imports");

                const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
                if (!(packageName in pins.dependencies) && !(packageName in pins.devDependencies)) {
                    if (!allowed("imports", rel(path), specifier)) fail(`${where}: imports "${specifier}", and ${packageName} isn't pinned in package.json`);
                    continue;
                }
                let resolved = null;
                try {
                    // Resolve the way a module does, so packages with separate ESM builds give the ESM one.
                    resolved = fileURLToPath(import.meta.resolve(specifier));
                } catch {
                    resolved = null;
                }
                if (resolved === null || !existsSync(resolved)) {
                    fail(`${where}: "${specifier}" doesn't resolve in ${packageName} ${pins.dependencies[packageName] ?? pins.devDependencies[packageName]}`);
                    continue;
                }
                if (!/\.(m?js|cjs)$/.test(resolved)) continue; // a stylesheet or other asset: existing is enough

                const loaded = await load(specifier);
                if (loaded.error) {
                    fail(`${where}: "${specifier}" fails to load: ${String(loaded.error.message).split("\n")[0]}`);
                    continue;
                }
                const names = [];
                if (defaultName) names.push("default");
                for (const part of (named ?? "").split(",")) {
                    const name = part.trim().split(/\s+as\s+/)[0];
                    if (name) names.push(name);
                }
                for (const name of names) {
                    count("imported names");
                    if (!(name in loaded.namespace)) fail(`${where}: "${specifier}" has no export named ${name}`);
                }
                if (namespaceName) {
                    if (!namespaces.has(namespaceName)) namespaces.set(namespaceName, new Set());
                    namespaces.get(namespaceName).add(specifier);
                }
            }
            namespaceUses.push({ where, body: sample.body });
        }

        // Members read off a namespace import (THREE.Timer) anywhere in the same file.
        for (const [namespaceName, specifiers] of namespaces) {
            const loaded = [];
            for (const specifier of specifiers) loaded.push(await load(specifier));
            const members = new RegExp(`(?<![\\w$.])${namespaceName.replace(/\$/g, "\\$")}\\.([A-Za-z_$][\\w$]*)`, "g");
            for (const { where, body } of namespaceUses) {
                for (const match of body.matchAll(members)) {
                    count("namespace members");
                    if (!loaded.some((entry) => entry.namespace && match[1] in entry.namespace)) {
                        fail(`${where}: ${namespaceName}.${match[1]} isn't exported by ${[...specifiers].join(" or ")}`);
                    }
                }
            }
        }
    }

    // Pinned versions are the ones the Status blocks name.
    const motionDir = join(skillsRoot, "motion-design", "reference");
    const statusPins = [
        ["gsap.md", /`gsap` (\d+\.\d+\.\d+)/, "gsap"],
        ["gsap.md", /`@gsap\/react` (\d+\.\d+\.\d+)/, "@gsap/react"],
        ["gsap.md", /`lenis` (?:is )?(\d+\.\d+\.\d+)/, "lenis"],
        ["threejs-core.md", /`three` (\d+\.\d+\.\d+)/, "three"]
    ];
    for (const [file, pattern, name] of statusPins) {
        const path = join(motionDir, file);
        if (!existsSync(path)) continue;
        const match = pattern.exec(readFileSync(path, "utf8"));
        count("version pins");
        if (!match) fail(`${rel(path)}: Status block no longer names a version for ${name}`);
        else if (match[1] !== pins.dependencies[name]) fail(`${rel(path)} says ${name} ${match[1]}, package.json pins ${pins.dependencies[name]}`);
    }

    // 3. Motion tokens: the definitions, then every CSS sample that uses them.
    const tokensPath = join(motionDir, "cross-platform-tokens.md");
    const defined = new Set();
    if (!existsSync(tokensPath)) {
        fail(`missing file: ${rel(tokensPath)}`);
    } else {
        const tokensText = readFileSync(tokensPath, "utf8");
        const definitionBlock = fences(tokensText, ["css"]).find((f) => /--spring-[a-z-]+:\s*linear\(/.test(f.body));
        if (!definitionBlock) {
            fail(`${rel(tokensPath)}: no :root block with the spring tokens`);
        } else {
            for (const match of definitionBlock.body.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) defined.add(match[1]);

            const springPattern = /\/\*\s*([a-z-]+): duration ([\d.]+)s, bounce ([\d.]+) \(stiffness (\d+), damping ratio ([\d.]+)\)[^*]*\*\/\s*--spring-([a-z-]+):\s*linear\(([^)]*)\);\s*--spring-([a-z-]+)-duration:\s*(\d+)ms;/g;
            let spring;
            let springs = 0;
            while ((spring = springPattern.exec(definitionBlock.body))) {
                const [, label, durationText, bounceText, stiffnessText, dampingText, name, stopsText, durationName, pairedMs] = spring;
                springs++;
                count("spring curves");
                const duration = Number(durationText);
                const bounce = Number(bounceText);
                const w0 = (2 * Math.PI) / duration;
                const z = 1 - bounce;
                if (label !== name || durationName !== name) fail(`spring ${name}: the comment, the curve and the duration token don't share a name`);
                if (Math.round(w0 * w0) !== Number(stiffnessText)) fail(`spring ${name}: comment says stiffness ${stiffnessText}, (2π / ${duration})² is ${Math.round(w0 * w0)}`);
                if (Math.abs(z - Number(dampingText)) > 1e-9) fail(`spring ${name}: comment says damping ratio ${dampingText}, 1 - bounce is ${z}`);

                const stops = stopsText.split(",").map((part) => {
                    const [value, position] = part.trim().split(/\s+/);
                    return { y: Number(value), x: position === undefined ? null : Number(position.replace("%", "")) / 100 };
                });
                stops[0].x ??= 0;
                stops[stops.length - 1].x ??= 1;
                if (stops.some((stop) => stop.x === null || Number.isNaN(stop.y) || Number.isNaN(stop.x))) {
                    fail(`spring ${name}: can't read the linear() stops`);
                    continue;
                }
                const curve = (x) => {
                    for (let i = 1; i < stops.length; i++) {
                        const a = stops[i - 1];
                        const b = stops[i];
                        if (x <= b.x) return b.x === a.x ? b.y : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
                    }
                    return stops[stops.length - 1].y;
                };
                const total = Number(pairedMs) / 1000;
                let worst = 0;
                for (let i = 0; i <= 2000; i++) worst = Math.max(worst, Math.abs(curve(i / 2000) - springAt((total * i) / 2000, w0, z)));
                if (worst > 0.004) fail(`spring ${name}: linear() is off the spring by ${worst.toFixed(4)} (limit 0.004)`);

                // The paired duration is the settle time: the last moment the spring is more than 0.1% from rest, rounded up to 10ms.
                let settle = 0;
                for (let t = 5; t > 0; t -= 0.001) {
                    if (Math.abs(springAt(t, w0, z) - 1) > 0.001) {
                        settle = t + 0.001;
                        break;
                    }
                }
                const expectedMs = Math.ceil(settle * 100 - 1e-9) * 10;
                if (Math.abs(expectedMs - Number(pairedMs)) > 10) fail(`spring ${name}: paired duration is ${pairedMs}ms, the spring settles at ${expectedMs}ms`);
            }
            if (springs === 0) fail(`${rel(tokensPath)}: found no spring tokens with a parameter comment above them`);
            const curveNames = [...definitionBlock.body.matchAll(/^\s*--spring-([a-z-]+?)(?:-duration)?\s*:/gm)].map((m) => m[1]);
            if (new Set(curveNames).size !== springs) fail(`${rel(tokensPath)}: ${new Set(curveNames).size} spring tokens defined, ${springs} have a readable parameter comment`);
        }
    }

    const motionToken = /--(?:spring|duration|ease|motion-distance)-[a-z0-9-]+/g;
    const timedProperty = /^(?:transition|animation)(?:-duration|-delay)?$/;
    for (const path of files) {
        const text = readFileSync(path, "utf8");
        const blocks = fences(text, ["css"]);
        const local = new Set();
        for (const block of blocks) for (const match of block.body.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) local.add(match[1]);

        for (const block of blocks) {
            const where = `${rel(path)}:${block.line}`;
            const css = stripCssComments(block.body);
            count("css samples");

            for (const match of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
                const name = match[1];
                if (!name.match(motionToken) || name.match(motionToken)[0] !== name) continue;
                count("motion token uses");
                // A style can declare extra tokens in its own file. Anything else has to be in the tokens file.
                if (!defined.has(name) && !local.has(name)) fail(`${where}: var(${name}) isn't defined in cross-platform-tokens.md or in this file`);
            }

            for (const declaration of css.split(/[;{}]/)) {
                const colon = declaration.indexOf(":");
                if (colon < 0) continue;
                const property = declaration.slice(0, colon).trim().split(/\s+/).pop();
                const value = declaration.slice(colon + 1);
                const isDefinition = property.startsWith("--");

                if (!isDefinition && /cubic-bezier\(/.test(value) && !allowed("rawMotionValues", rel(path), declaration)) {
                    fail(`${where}: raw cubic-bezier() outside a token definition: ${declaration.trim().replace(/\s+/g, " ").slice(0, 80)}`);
                }
                if (!isDefinition && timedProperty.test(property)) {
                    const bare = value.replace(/var\([^)]*\)/g, "").match(/(?<![\w.-])\d*\.?\d+m?s\b/g) ?? [];
                    const real = bare.filter((time) => parseFloat(time) !== 0);
                    if (real.length && !allowed("rawMotionValues", rel(path), declaration)) {
                        fail(`${where}: bare duration ${real.join(", ")} in ${property}: ${declaration.trim().replace(/\s+/g, " ").slice(0, 80)}`);
                    }
                }
            }
        }
    }

    return { failures, counts };
}

// ---------- entry ----------

const skillsRoot = join(repo, "skills", "claude");

if (flag("--self-test")) {
    const sandboxRepo = join(build, "self-test");
    const sandbox = join(sandboxRepo, "skills", "claude");
    rmSync(sandboxRepo, { recursive: true, force: true });
    mkdirSync(sandbox, { recursive: true });
    cpSync(join(skillsRoot, "motion-design"), join(sandbox, "motion-design"), { recursive: true });

    const clean = await run(sandbox, sandboxRepo, join(sandboxRepo, "samples"));

    const gsapPath = join(sandbox, "motion-design", "reference", "gsap.md");
    const original = readFileSync(gsapPath, "utf8");
    const good = 'import { ScrollTrigger } from "gsap/ScrollTrigger";';
    const bad = 'import { ScrollTriger } from "gsap/ScrollTrigger";';
    if (!original.includes(good)) {
        console.error("javascript self-test: couldn't find the import to break");
        process.exit(1);
    }
    writeFileSync(gsapPath, original.replace(good, bad));
    const broken = await run(sandbox, sandboxRepo, join(sandboxRepo, "samples"));
    const caught = broken.failures.some((message) => message.includes("no export named ScrollTriger"));

    if (clean.failures.length === 0 && caught) {
        console.log("javascript self-test: ok. Clean copy passes; a misspelled import (ScrollTriger) fails.");
        process.exit(0);
    }
    console.error("javascript self-test: FAILED");
    if (clean.failures.length) console.error(`  the clean copy has ${clean.failures.length} failures:\n  ${clean.failures.join("\n  ")}`);
    if (!caught) console.error("  the injected bad import name was not caught");
    process.exit(1);
}

const { failures, counts } = await run(skillsRoot, repo, join(build, "samples"));
for (const message of failures) console.error(`FAIL ${message}`);
const summary = Object.entries(counts)
    .map(([key, value]) => `${value} ${key}`)
    .join(", ");
if (failures.length) {
    console.error(`javascript: ${failures.length} failed. Checked ${summary}.`);
    process.exit(1);
}
console.log(`javascript: ok. ${summary}.`);
