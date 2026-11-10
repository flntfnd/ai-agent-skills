// Pulls every ts/tsx/typescript fence out of skills/claude/**/*.md into .build/<project>/.
// The markdown is the source on every run. Nothing extracted is committed.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { overrides, projects } from "./samples.config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const skillsRoot = join(here, "..", "..", "skills", "claude");
const buildRoot = join(here, ".build");
const selfTest = process.argv.includes("--self-test");

const FENCE = /^```(ts|tsx|typescript)[ \t]*\n([\s\S]*?)^```/gm;
const PATH_COMMENT = /^\/\/\s*(\.?[\w@\[\]-][\w.@\[\]\/-]*\.tsx?)\b/;

function markdownFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return markdownFiles(full);
        return entry.name.endsWith(".md") ? [full] : [];
    }).sort();
}

function projectFor(skill) {
    return Object.keys(projects).find((name) => projects[name].includes(skill));
}

rmSync(buildRoot, { recursive: true, force: true });
for (const name of Object.keys(projects)) {
    cpSync(join(here, name), join(buildRoot, name), { recursive: true });
}

const manifest = [];
const skipped = [];
const unrouted = new Set();
const usedOverrides = new Set();
const taken = new Set();

for (const file of markdownFiles(skillsRoot)) {
    const rel = relative(skillsRoot, file).split("\\").join("/");
    const skill = rel.split("/")[0];
    const text = readFileSync(file, "utf8");
    let index = -1;

    for (const match of text.matchAll(FENCE)) {
        index += 1;
        const key = `${rel}#${index}`;
        const line = text.slice(0, match.index).split("\n").length;
        const source = `skills/claude/${rel}:${line}`;
        const rule = overrides[key] ?? {};
        if (overrides[key]) usedOverrides.add(key);

        const project = projectFor(skill);
        if (!project) {
            unrouted.add(skill);
            continue;
        }
        if (rule.skip !== undefined) {
            if (!rule.skip.trim()) throw new Error(`${key}: a skip needs a reason`);
            skipped.push({ key, reason: rule.skip });
            continue;
        }

        const ext = match[1] === "tsx" ? "tsx" : "ts";
        const body = match[2];
        const named = rule.file ?? body.match(PATH_COMMENT)?.[1];
        let target = named ?? `${rel.replace(/\.md$/, "").replace(/[^\w]+/g, "-")}-${index}.${ext}`;

        // Two samples can claim one path (two next.config.ts). The later one gets a number,
        // in the same directory so its relative imports still resolve.
        for (let n = 2; taken.has(`${project}/${target}`); n += 1) {
            target = (named ?? target).replace(/(\.tsx?)$/, `.${n}$1`);
        }
        taken.add(`${project}/${target}`);

        const out = join(buildRoot, project, target);
        mkdirSync(dirname(out), { recursive: true });
        // Line 1 is the source, so a tsc line number is the fence's line number plus one.
        writeFileSync(out, `// ${source}\n${rule.before ?? ""}${body}${rule.after ?? ""}\nexport {};\n`);
        manifest.push({ project, target, source, wrapped: Boolean(rule.before || rule.after || rule.file) });
    }
}

const stale = Object.keys(overrides).filter((key) => !usedOverrides.has(key));
if (unrouted.size) throw new Error(`No project in samples.config.mjs for: ${[...unrouted].join(", ")}`);
if (stale.length) throw new Error(`samples.config.mjs names fences that don't exist: ${stale.join(", ")}`);

if (selfTest) {
    const project = Object.keys(projects)[0];
    const target = "self-test-broken.ts";
    writeFileSync(join(buildRoot, project, target), `const broken: number = "not a number";\nexport { broken };\n`);
    manifest.push({ project, target, source: "self-test", wrapped: false });
}

writeFileSync(join(buildRoot, "manifest.json"), JSON.stringify({ samples: manifest, skipped }, null, 2));
for (const { key, reason } of skipped) console.log(`skipped ${key}: ${reason}`);
