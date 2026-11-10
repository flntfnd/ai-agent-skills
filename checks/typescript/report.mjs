// Turns tsc output into the one-line summary. Usage: node report.mjs <project>=<tsc log> ...
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { samples, skipped } = JSON.parse(readFileSync(join(here, ".build", "manifest.json"), "utf8"));
const failed = new Map();
let otherErrors = 0;

for (const arg of process.argv.slice(2)) {
    const [project, log] = arg.split("=");
    const text = existsSync(log) ? readFileSync(log, "utf8") : "";
    for (const line of text.split("\n")) {
        const hit = line.match(/^(.+?)\(\d+,\d+\): error TS\d+/);
        if (!hit) {
            if (/error TS\d+/.test(line)) otherErrors += 1;
            continue;
        }
        const path = hit[1].split("\\").join("/").replace(/^\.\//, "");
        const sample = samples.find((s) => s.project === project && s.target === path);
        if (sample) failed.set(`${project}/${path}`, sample.source);
        else otherErrors += 1;
    }
}

for (const [path, source] of failed) console.log(`FAIL ${path}  <-  ${source}`);

const perProject = Object.entries(Object.groupBy(samples, (s) => s.project))
    .map(([name, list]) => `${name} ${list.length}`).join(", ");
const ok = failed.size === 0 && otherErrors === 0;
const extra = otherErrors ? `, ${otherErrors} errors outside samples` : "";
console.log(
    `typescript: ${samples.length} samples checked (${perProject}), ${samples.length - failed.size} passed, ` +
    `${failed.size} failed, ${skipped.length} skipped${extra}: ${ok ? "PASS" : "FAIL"}`
);
process.exit(ok ? 0 : 1);
