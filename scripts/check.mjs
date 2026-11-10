#!/usr/bin/env node
// Lints the skill library and confirms the generated folders are current.
// Usage: node scripts/check.mjs

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESCRIPTION_LIMIT = 1024;
const LISTING_LIMIT = 1536; // description + when_to_use, as Claude Code lists them
const SKILL_LINE_LIMIT = 500;
const SPEC_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];

const problems = [];
const report = (file, message) => problems.push(`${relative(ROOT, file)}: ${message}`);

function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return entry.endsWith('.md') ? [path] : [];
  });
}

function frontmatter(file) {
  const match = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  return Object.fromEntries(match[1].split('\n').map((line) => {
    const [, key, value] = line.match(/^([a-z_-]+):\s*(.*)$/) ?? [];
    return [key, value?.startsWith('"') ? JSON.parse(value) : value];
  }));
}

function checkSkillSet(set, { specOnly }) {
  const base = join(ROOT, 'skills', set);
  for (const name of readdirSync(base).filter((n) => statSync(join(base, n)).isDirectory())) {
    const skillFile = join(base, name, 'SKILL.md');
    if (!existsSync(skillFile)) {
      report(join(base, name), 'no SKILL.md');
      continue;
    }
    const fields = frontmatter(skillFile);
    if (!fields) {
      report(skillFile, 'no frontmatter');
      continue;
    }
    if (fields.name !== name) report(skillFile, `name "${fields.name}" doesn't match the directory`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) report(skillFile, 'name must be lowercase letters, digits and single hyphens, 64 characters at most');
    const description = fields.description ?? '';
    if (!description) report(skillFile, 'no description');
    if (description.length > DESCRIPTION_LIMIT) report(skillFile, `description is ${description.length} characters (limit ${DESCRIPTION_LIMIT})`);
    const listing = description.length + (fields.when_to_use?.length ?? 0);
    if (listing > LISTING_LIMIT) report(skillFile, `description plus when_to_use is ${listing} characters (limit ${LISTING_LIMIT})`);
    if (specOnly) {
      for (const key of Object.keys(fields)) if (!SPEC_FIELDS.includes(key)) report(skillFile, `"${key}" isn't an Agent Skills spec field`);
      if (!/\bUse when\b/i.test(description)) report(skillFile, 'description has no "Use when" clause');
    }
    const text = readFileSync(skillFile, 'utf8');
    const lines = text.split('\n').length;
    if (lines > SKILL_LINE_LIMIT) report(skillFile, `${lines} lines (limit ${SKILL_LINE_LIMIT})`);
    const refDir = join(base, name, 'reference');
    for (const file of existsSync(refDir) ? readdirSync(refDir).filter((f) => f.endsWith('.md')) : []) {
      if (!text.includes(`reference/${file}`)) report(join(refDir, file), 'not referenced from SKILL.md');
    }
  }
}

function checkProse(file) {
  const text = readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (/[–—]/.test(line)) report(file, `line ${i + 1}: em or en dash`);
  });
  for (const [, target] of text.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
    if (/^[a-z]+:/.test(target)) continue;
    if (!existsSync(join(dirname(file), target))) report(file, `broken link: ${target}`);
  }
}

checkSkillSet('claude', { specOnly: false });
checkSkillSet('portable', { specOnly: true });
for (const file of [...markdownFiles(join(ROOT, 'skills')), ...['README.md', 'CLAUDE.md', 'AGENTS.md'].map((f) => join(ROOT, f))]) checkProse(file);

const build = spawnSync(process.execPath, [join(ROOT, 'scripts/build.mjs'), '--check'], { encoding: 'utf8' });
if (build.status !== 0) problems.push(build.stderr.trim());

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\ncheck: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('check: clean');
