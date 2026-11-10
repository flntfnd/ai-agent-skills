// Checks the color-system skill against its own palette.
// Everything is read from the markdown at run time. No dependencies.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const repo = option("--repo");
if (!repo) {
    console.error("usage: check.mjs --repo <repo root> [--self-test --build <dir>]");
    process.exit(2);
}

// ---------- color math ----------

const hexToLinear = (hex) =>
    [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });

function luminance(hex) {
    const [r, g, b] = hexToLinear(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hexA, hexB) {
    const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
}

// CSS Color 4 OKLab matrices.
function hexToOklch(hex) {
    const [r, g, b] = hexToLinear(hex);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    const C = Math.hypot(a, bb);
    const H = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
    return { L, C, H };
}

function formatOklch(hex) {
    const { L, C, H } = hexToOklch(hex);
    if (C < 0.0005) return `oklch(${(L * 100).toFixed(2)}% 0 0)`;
    return `oklch(${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${H.toFixed(2)})`;
}

function oklchToHex(text) {
    const match = /^oklch\(([\d.]+)% ([\d.]+) ([\d.]+)\)$/.exec(text);
    if (!match) return null;
    const L = Number(match[1]) / 100;
    const C = Number(match[2]);
    const H = (Number(match[3]) * Math.PI) / 180;
    const a = C * Math.cos(H);
    const b = C * Math.sin(H);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const linear = [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
    const encode = (c) => {
        const clamped = Math.min(1, Math.max(0, c));
        const v = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
        return Math.round(255 * v).toString(16).padStart(2, "0");
    };
    return `#${linear.map(encode).join("")}`.toUpperCase();
}

// ---------- helpers ----------

const normalize = (text) => text.replace(/\s+/g, " ").trim();
const kebab = (name) =>
    name
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/([A-Za-z])([0-9])/g, "$1-$2")
        .toLowerCase();

function markdownFiles(dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) out.push(...markdownFiles(full));
        else if (entry.endsWith(".md")) out.push(full);
    }
    return out.sort();
}

function fences(text) {
    const out = [];
    const pattern = /^```([^\n]*)\n([\s\S]*?)^```/gm;
    let match;
    while ((match = pattern.exec(text))) out.push({ lang: match[1].trim(), body: match[2], index: match.index });
    return out;
}

const withoutFences = (text) => text.replace(/^```[^\n]*\n[\s\S]*?^```/gm, "");

// ---------- the check ----------

function run(skillsRoot, repoRoot) {
    const failures = [];
    const counts = {};
    const fail = (message) => failures.push(message);
    const count = (key, n = 1) => (counts[key] = (counts[key] ?? 0) + n);
    const rel = (path) => relative(repoRoot, path);

    const colorDir = join(skillsRoot, "color-system");
    const palettePath = join(colorDir, "reference", "palette.md");
    const skillPath = join(colorDir, "SKILL.md");
    const implementationPath = join(colorDir, "reference", "implementation.md");
    const architecturePath = join(skillsRoot, "figma-design-system", "reference", "token-architecture.md");
    for (const path of [palettePath, skillPath, implementationPath, architecturePath]) {
        if (!existsSync(path)) {
            fail(`missing file: ${rel(path)}`);
            return { failures, counts };
        }
    }
    const exceptions = JSON.parse(readFileSync(new URL("./exceptions.json", import.meta.url), "utf8"));

    const paletteText = readFileSync(palettePath, "utf8");
    const skillText = readFileSync(skillPath, "utf8");
    const implementationText = readFileSync(implementationPath, "utf8");
    const architectureText = readFileSync(architecturePath, "utf8");

    // 1. Palette rows: round-trip, unique names, unique hexes.
    const palette = new Map();
    const hexOwners = new Map();
    const rowPattern = /^\| `([a-z0-9-]+)` \| `(#[0-9A-Fa-f]{6})` \| `(oklch\([^)]*\))` \|/gm;
    let row;
    while ((row = rowPattern.exec(paletteText))) {
        const [, name, hexRaw, oklch] = row;
        const hex = hexRaw.toUpperCase();
        count("primitives");
        if (palette.has(name)) fail(`palette: duplicate name ${name}`);
        palette.set(name, { hex, oklch });
        if (hexOwners.has(hex)) fail(`palette: ${name} and ${hexOwners.get(hex)} share ${hex}`);
        else hexOwners.set(hex, name);
        if (oklchToHex(oklch) !== hex) fail(`palette: ${name} ${oklch} converts to ${oklchToHex(oklch)}, not ${hex}`);
        if (formatOklch(hex) !== oklch) fail(`palette: ${name} ${hex} converts to ${formatOklch(hex)}, not ${oklch}`);
    }
    if (palette.size === 0) {
        fail("palette: no primitive rows found");
        return { failures, counts };
    }
    const stated = [...skillText.matchAll(/(\d+) (?:named )?primitives/g), ...paletteText.matchAll(/All (\d+) primitives/g)];
    for (const match of stated) {
        if (Number(match[1]) !== palette.size) fail(`stated primitive count ${match[1]} is not the palette's ${palette.size}`);
    }

    // 2a. Every primitive name used in color-system exists.
    const families = [...new Set([...palette.keys()].map((name) => name.split("-")[0]))];
    const namePattern = new RegExp(`(?<![A-Za-z0-9-])(?:${families.join("|")})-[a-z0-9]+(?:-[a-z0-9]+)*(?![A-Za-z0-9-])`, "g");
    const scanNames = (text) => text.replace(/--color-semantic-[a-z0-9-]+/g, "").match(namePattern) ?? [];
    const sources = [
        [skillPath, skillText],
        [implementationPath, implementationText],
        // In the palette file only backticked names in prose and notes are references.
        [palettePath, (paletteText.match(/`[a-z]+-[a-z0-9-]+`/g) ?? []).join(" ")]
    ];
    for (const [path, text] of sources) {
        for (const name of new Set(scanNames(text))) {
            count("name references");
            if (!palette.has(name)) fail(`${rel(path)}: ${name} is not in the palette`);
        }
    }

    // 2b. Literals in samples match the palette row.
    const allowedLiteral = (path, name, value) =>
        exceptions.literals.some((e) => e.file === rel(path) && e.name === name && normalize(e.value) === normalize(value));
    for (const [path, text] of sources.slice(0, 2)) {
        for (const match of text.matchAll(/--color-primitive-([a-z0-9-]+):\s*(oklch\([^)]*\)|#[0-9A-Fa-f]{6})/g)) {
            const [, name, value] = match;
            const entry = palette.get(name);
            count("literals");
            if (!entry) continue;
            const expected = value.startsWith("#") ? entry.hex : entry.oklch;
            const actual = value.startsWith("#") ? value.toUpperCase() : normalize(value);
            if (actual !== expected && !allowedLiteral(path, name, value)) {
                fail(`${rel(path)}: --color-primitive-${name} is ${value}, palette says ${expected}`);
            }
        }
        for (const match of text.matchAll(/val (\w+) = Color\(0xFF([0-9A-Fa-f]{6})\)/g)) {
            const name = kebab(match[1]);
            const hex = `#${match[2].toUpperCase()}`;
            count("literals");
            if (!palette.has(name)) fail(`${rel(path)}: ${match[1]} maps to ${name}, which is not in the palette`);
            else if (palette.get(name).hex !== hex) fail(`${rel(path)}: ${match[1]} is ${hex}, palette says ${palette.get(name).hex}`);
        }
        for (const line of text.split("\n")) {
            const range = /([a-z]+-[a-z0-9-]+) \.\. ([a-z]+-[a-z0-9-]+)\s+(#[0-9A-Fa-f]{6}) \.\. (#[0-9A-Fa-f]{6})/.exec(line);
            const pairs = range
                ? [
                      [range[1], range[3]],
                      [range[2], range[4]]
                  ]
                : [...line.matchAll(/([a-z]+-[a-z0-9-]+)\s+(?:\(|→ )?(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]);
            for (const [name, hex] of pairs) {
                if (!palette.has(name)) continue;
                count("literals");
                if (palette.get(name).hex !== hex.toUpperCase()) {
                    fail(`${rel(path)}: ${name} is written as ${hex}, palette says ${palette.get(name).hex}`);
                }
            }
            for (const match of line.matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
                if (!hexOwners.has(match[0].toUpperCase())) fail(`${rel(path)}: ${match[0]} is not a palette value`);
            }
        }
    }

    // Semantic mapping table.
    const mapping = new Map();
    const mappingFence = fences(skillText).find((f) => /^Token\s+Light\s+Dark/m.test(f.body));
    if (!mappingFence) {
        fail("SKILL.md: semantic mapping table not found");
        return { failures, counts };
    }
    for (const line of mappingFence.body.split("\n")) {
        const match = /^([a-z]+\/[a-z-]+)\s+([a-z0-9-]+)\s+([a-z0-9-]+)\s*$/.exec(line);
        if (!match) continue;
        const [, token, light, dark] = match;
        for (const name of [light, dark]) if (!palette.has(name)) fail(`mapping: ${token} points at ${name}, not in the palette`);
        mapping.set(token, { light, dark });
        count("semantic tokens");
    }
    const hexOf = (name) => palette.get(name)?.hex;
    const ratio = (a, b) => (hexOf(a) && hexOf(b) ? contrast(hexOf(a), hexOf(b)) : NaN);
    const backgrounds = [...mapping.keys()].filter((token) => token.startsWith("background/"));

    // 3. Every contrast figure printed in SKILL.md.
    const expectFigure = (shown, value, where) => {
        count("contrast figures");
        const decimals = (shown.split(".")[1] ?? "").length;
        if (Number.isNaN(value) || value.toFixed(decimals) !== shown) {
            fail(`contrast: ${where} prints ${shown}, computed ${Number.isNaN(value) ? "n/a" : value.toFixed(decimals)}`);
        }
    };
    const contrastStart = skillText.indexOf("\n## Contrast");
    if (contrastStart < 0) fail("SKILL.md: Contrast section not found");
    const contrastSection = contrastStart < 0 ? "" : skillText.slice(contrastStart);
    for (const fence of fences(contrastSection)) {
        let section = null;
        for (const rawLine of fence.body.split("\n")) {
            const line = rawLine.trimEnd();
            if (!line.trim()) continue;
            const header = /^(Light|Dark)\. Ratios on .*\(([^)]+)\)/.exec(line);
            if (header) {
                section = { kind: "tokens", mode: header[1].toLowerCase(), surfaces: header[2].split("/").map((s) => s.trim()) };
                const mapped = backgrounds.map((token) => mapping.get(token)[section.mode]);
                const expected = ["background/primary", "background/elevated", "background/sunken"].map((t) => mapping.get(t)?.[section.mode]);
                if (section.surfaces.join() !== expected.join()) {
                    fail(`contrast: ${section.mode} header lists ${section.surfaces.join(" / ")}, mapping says ${expected.join(" / ")}`);
                }
                void mapped;
                continue;
            }
            if (/^Labels\./.test(line)) {
                section = { kind: "labels" };
                continue;
            }
            if (/^Fills /.test(line)) {
                section = { kind: "fills" };
                continue;
            }

            let match;
            if (section?.kind === "tokens" && (match = /^([a-z]+\/[a-z-]+)\s+([a-z0-9-]+)\s+([\d.]+(?: \/ [\d.]+)*)\s*$/.exec(line))) {
                const [, token, primitive, figures] = match;
                if (mapping.get(token)?.[section.mode] !== primitive) {
                    fail(`contrast: ${token} ${section.mode} row says ${primitive}, mapping says ${mapping.get(token)?.[section.mode]}`);
                }
                const shown = figures.split(" / ");
                if (shown.length !== section.surfaces.length) fail(`contrast: ${token} ${section.mode} row has ${shown.length} figures`);
                shown.forEach((figure, i) => expectFigure(figure, ratio(primitive, section.surfaces[i]), `${token} ${section.mode} on ${section.surfaces[i]}`));
                continue;
            }
            if (section?.kind === "labels" && (match = /^([a-z]+\/[a-z-]+)\s+light ([a-z0-9-]+)\s+([\d.]+)\s+dark ([a-z0-9-]+)\s+([\d.]+)\s*$/.exec(line))) {
                const [, token, light, lightFigure, dark, darkFigure] = match;
                const label = mapping.get(exceptions.contrast.label.token);
                if (mapping.get(token)?.light !== light || mapping.get(token)?.dark !== dark) fail(`contrast: label row for ${token} doesn't match the mapping`);
                expectFigure(lightFigure, ratio(label.light, light), `label on ${token} light`);
                expectFigure(darkFigure, ratio(label.dark, dark), `label on ${token} dark`);
                continue;
            }
            if (section?.kind === "fills" && (match = /^([a-z]+\/[a-z-]+)\s+light ([\d.]+) min\s+dark ([\d.]+) min\s*$/.exec(line))) {
                const [, token, lightFigure, darkFigure] = match;
                for (const [mode, figure] of [
                    ["light", lightFigure],
                    ["dark", darkFigure]
                ]) {
                    const lowest = Math.min(...backgrounds.map((bg) => ratio(mapping.get(token)?.[mode], mapping.get(bg)[mode])));
                    expectFigure(figure, lowest, `${token} ${mode} fill minimum`);
                }
                continue;
            }
            if ((match = /^([a-z]+-[a-z0-9-]+) on ([a-z0-9-]+(?: \/ [a-z0-9-]+)*)(?: \([^)]*\))?\s+([\d.]+(?: \/ [\d.]+)*)(?:\s|$)/.exec(line))) {
                const [, foreground, surfaces, figures] = match;
                const surfaceList = surfaces.split(" / ");
                const shown = figures.split(" / ");
                if (shown.length !== surfaceList.length) fail(`contrast: "${line.trim()}" has ${shown.length} figures for ${surfaceList.length} surfaces`);
                shown.forEach((figure, i) => expectFigure(figure, ratio(foreground, surfaceList[i]), `${foreground} on ${surfaceList[i]}`));
                continue;
            }
            if (/\d\.\d/.test(line)) fail(`contrast: can't read this line, so its figures are unchecked: "${line.trim()}"`);
        }
    }
    // Two-decimal ratios in prose must be a real ratio between two primitives named on the same line.
    for (const line of withoutFences(skillText).split("\n")) {
        const figures = [...line.matchAll(/(\d+\.\d{2}):1/g)].map((m) => m[1]);
        if (!figures.length) continue;
        const names = [...new Set(scanNames(line))].filter((name) => palette.has(name));
        const possible = new Set();
        for (const a of names) for (const b of names) if (a !== b) possible.add(ratio(a, b).toFixed(2));
        for (const figure of figures) {
            count("contrast figures");
            if (!possible.has(figure)) fail(`contrast: prose says ${figure}:1 but no pair of primitives on that line gives it: "${line.trim().slice(0, 90)}"`);
        }
    }

    // 4. Every semantic token meets its rule in both modes.
    const rules = exceptions.contrast;
    for (const entry of [...rules.exempt, ...rules.overrides]) {
        if (!mapping.has(entry.token)) fail(`exceptions.json: ${entry.token} is not a mapped token`);
        if (!skillText.includes(entry.evidence)) fail(`exceptions.json: SKILL.md no longer says "${entry.evidence}" (rule for ${entry.token})`);
    }
    const exempt = new Set(rules.exempt.map((e) => e.token));
    for (const [token, primitives] of mapping) {
        const group = token.split("/")[0];
        if (group === "background" || exempt.has(token)) continue;
        const rule = rules.defaults[group];
        if (!rule) {
            fail(`rules: no contrast rule for group ${group} (${token})`);
            continue;
        }
        for (const mode of ["light", "dark"]) {
            for (const bg of backgrounds) {
                const override = rules.overrides.find((o) => o.token === token && o.mode === mode && o.on === bg);
                const minimum = override?.min ?? rule.min;
                const value = ratio(primitives[mode], mapping.get(bg)[mode]);
                count("rule checks");
                if (!(value >= minimum)) fail(`rules: ${token} ${mode} on ${bg} is ${value.toFixed(2)}, needs ${minimum}`);
            }
            if (group === "interactive") {
                const label = mapping.get(rules.label.token)?.[mode];
                const value = ratio(label, primitives[mode]);
                count("rule checks");
                if (!(value >= rules.label.min)) fail(`rules: ${rules.label.token} on ${token} ${mode} is ${value.toFixed(2)}, needs ${rules.label.min}`);
            }
        }
    }

    // 5. Groups and roles follow token-architecture.md.
    const groupLine = architectureText.split("\n").find((line) => /Groups:/.test(line) && /color\/semantic/.test(line));
    const groups = new Set(groupLine ? [...groupLine.slice(groupLine.indexOf("Groups:")).matchAll(/`([a-z]+)`/g)].map((m) => m[1]) : []);
    if (groups.size !== 6) fail(`token-architecture.md: expected six semantic color groups, found ${groups.size}`);
    for (const token of mapping.keys()) {
        const [group, role] = token.split("/");
        if (!groups.has(group)) fail(`naming: group ${group} (${token}) is not in token-architecture.md`);
        const state = /^(.*)-(hover|pressed|disabled|focus)$/.exec(role);
        if (state && !mapping.has(`${group}/${state[1]}`)) fail(`naming: ${token} is a state of ${group}/${state[1]}, which is not mapped`);
    }
    for (const group of groups) {
        if (![...mapping.keys()].some((token) => token.startsWith(`${group}/`))) fail(`naming: group ${group} has no mapping in color-system`);
    }
    for (const [path, text] of sources.slice(0, 2)) {
        for (const match of text.matchAll(/--color-semantic-([a-z]+)-/g)) {
            if (!groups.has(match[1])) fail(`${rel(path)}: --color-semantic-${match[1]}-... uses a group that isn't allowed`);
        }
        for (const match of text.matchAll(/Color\.Semantic\.([A-Za-z]+)\./g)) {
            if (!groups.has(match[1].toLowerCase())) fail(`${rel(path)}: Color.Semantic.${match[1]} uses a group that isn't allowed`);
        }
        for (const match of text.matchAll(/color\/semantic\/([a-z]+)\//g)) {
            if (!groups.has(match[1])) fail(`${rel(path)}: color/semantic/${match[1]}/... uses a group that isn't allowed`);
        }
    }

    // 6. No primitive reference anywhere in the skills points at a name the palette doesn't have.
    // token-architecture.md allows a project's own ramp, named <hue>-<step>. That's fine as long
    // as the hue isn't one of this palette's families, where the name has to exist.
    const allowsProjectRamps = /project ramp is `<hue>-<step>`/.test(architectureText);
    const isProjectRamp = (name) => {
        const match = /^([a-z]+)-(50|[1-9]00|950)$/.exec(name);
        return allowsProjectRamps && match !== null && !families.includes(match[1]);
    };
    const allowedReference = (path, name) => exceptions.primitiveReferences.some((e) => e.file === rel(path) && e.name === name);
    for (const path of markdownFiles(skillsRoot)) {
        const text = readFileSync(path, "utf8");
        const found = [
            ...[...text.matchAll(/color\/primitive\/([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1]),
            ...[...text.matchAll(/--color-primitive-([a-z0-9]+(?:-[a-z0-9]+)*)/g)].map((m) => m[1]),
            ...[...text.matchAll(/Color\.Primitive\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => kebab(m[1]))
        ];
        for (const name of new Set(found)) {
            count("primitive references");
            if (!palette.has(name) && !isProjectRamp(name) && !allowedReference(path, name)) fail(`${rel(path)}: references primitive ${name}, which is not in the palette`);
        }
    }

    return { failures, counts };
}

// ---------- entry ----------

const skillsRoot = join(repo, "skills", "claude");

if (flag("--self-test")) {
    const build = option("--build");
    const sandbox = join(build, "self-test", "skills", "claude");
    rmSync(join(build, "self-test"), { recursive: true, force: true });
    mkdirSync(join(sandbox, "figma-design-system", "reference"), { recursive: true });
    cpSync(join(skillsRoot, "color-system"), join(sandbox, "color-system"), { recursive: true });
    cpSync(
        join(skillsRoot, "figma-design-system", "reference", "token-architecture.md"),
        join(sandbox, "figma-design-system", "reference", "token-architecture.md")
    );
    const sandboxRepo = join(build, "self-test");

    const clean = run(sandbox, sandboxRepo);
    const skillPath = join(sandbox, "color-system", "SKILL.md");
    const original = readFileSync(skillPath, "utf8");
    const figure = /^text\/primary\s+\S+\s+(\d+\.\d+) \//m.exec(original);
    if (!figure) {
        console.error("self-test: couldn't find a contrast figure to break");
        process.exit(1);
    }
    const wrong = (Number(figure[1]) + 0.01).toFixed(2);
    writeFileSync(skillPath, original.replace(figure[0], figure[0].replace(figure[1], wrong)));
    const broken = run(sandbox, sandboxRepo);
    const caught = broken.failures.some((message) => message.startsWith("contrast:") && message.includes(wrong));

    if (clean.failures.length === 0 && caught) {
        console.log(`color self-test: ok. Clean copy passes; a wrong contrast figure (${figure[1]} written as ${wrong}) fails.`);
        process.exit(0);
    }
    console.error("color self-test: FAILED");
    if (clean.failures.length) console.error(`  the clean copy has ${clean.failures.length} failures`);
    if (!caught) console.error("  the injected wrong contrast figure was not caught");
    process.exit(1);
}

const { failures, counts } = run(skillsRoot, repo);
for (const message of failures) console.error(`FAIL ${message}`);
const summary = Object.entries(counts)
    .map(([key, value]) => `${value} ${key}`)
    .join(", ");
if (failures.length) {
    console.error(`color: ${failures.length} failed. Checked ${summary}.`);
    process.exit(1);
}
console.log(`color: ok. ${summary}.`);
