#!/usr/bin/env node
// Trigger test: runs each case through headless Claude Code and records which
// skills the model loads through the Skill tool. See README.md.

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const SKILLS = [
  'android-platform', 'apple-platform', 'backend-conventions', 'code-audit', 'color-system',
  'figma-design-system', 'motion-design', 'rust-conventions', 'visual-styles', 'web-platform',
];
const DEFAULT_SAMPLE = 12;
const PLUGIN_NAME = 'portable';
// Once a reply has this much prose and no Skill call, the model is answering. Stop paying for it.
const ANSWER_CHARS = 400;

function parseArgs(argv) {
  const opts = { set: 'claude', concurrency: 4, maxTurns: 6, timeout: 240, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`${a} needs a value`);
      return v;
    };
    if (a === '--limit') opts.limit = Number(next());
    else if (a === '--only') opts.only = next();
    else if (a === '--id') opts.id = next();
    else if (a === '--set') opts.set = next();
    else if (a === '--model') opts.model = next();
    else if (a === '--concurrency') opts.concurrency = Number(next());
    else if (a === '--max-turns') opts.maxTurns = Number(next());
    else if (a === '--timeout') opts.timeout = Number(next());
    else if (a === '--json') opts.json = next();
    else if (a === '--all') opts.all = true;
    else if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
    else fail(`unknown option ${a}\n\n${USAGE}`);
  }
  if (!['claude', 'portable'].includes(opts.set)) fail('--set takes claude or portable');
  if (opts.only && opts.only !== 'none' && !SKILLS.includes(opts.only)) fail(`--only takes a skill name or "none": ${SKILLS.join(', ')}`);
  if (opts.limit !== undefined && !(opts.limit > 0)) fail('--limit takes a positive number');
  return opts;
}

const USAGE = `node checks/triggers/run.mjs [options]

  (no options)         run a spread of ${DEFAULT_SAMPLE} cases
  --all                run every case
  --limit N            run N cases, spread evenly across the list
  --only <skill>       run the cases that expect <skill> ("none" for the negatives)
  --id <case-id>       run one case
  --set claude|portable   claude: the skills installed in ~/.claude/skills (default)
                          portable: skills/portable, loaded as a temporary plugin
  --model <name>       model for the runs (default: your Claude Code default)
  --concurrency N      parallel runs (default 4)
  --max-turns N        turn cap per case (default 6)
  --timeout SECONDS    per case (default 240)
  --json <path>        write the raw results as JSON

Every case is one real model call or more.`;

function fail(msg) {
  console.error(msg);
  process.exit(2);
}

function pickCases(all, opts) {
  let cases = all;
  if (opts.id) cases = cases.filter((c) => c.id === opts.id);
  if (opts.only === 'none') cases = cases.filter((c) => c.expect.length === 0);
  else if (opts.only) cases = cases.filter((c) => c.expect.includes(opts.only));
  const filtered = Boolean(opts.id || opts.only);
  const limit = opts.limit ?? (opts.all || filtered ? cases.length : DEFAULT_SAMPLE);
  if (limit >= cases.length) return cases;
  return Array.from({ length: limit }, (_, i) => cases[Math.floor((i * cases.length) / limit)]);
}

function userDisabledSkills() {
  try {
    const settings = JSON.parse(readFileSync(join(homedir(), '.claude', 'settings.json'), 'utf8'));
    return SKILLS.filter((s) => settings.skillOverrides?.[s] && settings.skillOverrides[s] !== 'on');
  } catch {
    return [];
  }
}

// The portable set has the same skill names as the installed set, so it goes in as a
// throwaway plugin (skills show up as portable:<name>) and the installed ten are switched off.
function buildPortablePlugin(workdir) {
  const root = join(workdir, 'plugin');
  mkdirSync(join(root, '.claude-plugin'), { recursive: true });
  writeFileSync(
    join(root, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: PLUGIN_NAME, description: 'skills/portable under test', version: '0.0.0' }),
  );
  symlinkSync(join(REPO, 'skills', 'portable'), join(root, 'skills'));
  return root;
}

function claudeArgs(prompt, opts, pluginDir) {
  const overrides = Object.fromEntries(SKILLS.map((s) => [s, opts.set === 'claude' ? 'on' : 'off']));
  const args = [
    '-p', prompt,
    '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--max-turns', String(opts.maxTurns),
    '--tools', 'Skill',
    '--allowedTools', 'Skill',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--exclude-dynamic-system-prompt-sections',
    '--settings', JSON.stringify({ skillOverrides: overrides }),
  ];
  if (pluginDir) args.push('--plugin-dir', pluginDir);
  if (opts.model) args.push('--model', opts.model);
  return args;
}

function normalize(name, set) {
  const prefix = `${PLUGIN_NAME}:`;
  if (set === 'portable') return name.startsWith(prefix) ? name.slice(prefix.length) : name;
  return name;
}

function runCase(testCase, opts, cwd, pluginDir) {
  return new Promise((done) => {
    const child = spawn('claude', claudeArgs(testCase.prompt, opts, pluginDir), { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = { loaded: [], other: [], usage: { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 }, calls: 0, error: null, available: null, model: null, costUsd: null };
    let buffer = '';
    let stderr = '';
    let proseChars = 0;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      child.kill('SIGTERM');
    };
    const timer = setTimeout(() => {
      out.error = `timed out after ${opts.timeout}s`;
      stop();
    }, opts.timeout * 1000);

    const addUsage = (u) => {
      if (!u) return;
      out.usage.input += u.input_tokens ?? 0;
      out.usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
      out.usage.cacheRead += u.cache_read_input_tokens ?? 0;
    };

    const onEvent = (e) => {
      if (e.type === 'system' && e.subtype === 'init') {
        out.model = e.model;
        out.available = (e.skills ?? []).map((s) => normalize(s, opts.set));
        const missing = SKILLS.filter((s) => !out.available.includes(s));
        if (missing.length) {
          out.error = `skills not available to the session: ${missing.join(', ')}`;
          stop();
        }
        return;
      }
      // Only the main conversation counts. Subagent traffic carries a parent id.
      if (e.parent_tool_use_id) return;
      if (e.type === 'stream_event') {
        const ev = e.event;
        if (ev.type === 'message_start') {
          out.calls += 1;
          proseChars = 0;
          addUsage(ev.message?.usage);
        } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          proseChars += ev.delta.text.length;
          if (proseChars > ANSWER_CHARS) stop();
        } else if (ev.type === 'message_delta') {
          out.usage.output += ev.usage?.output_tokens ?? 0;
          if (ev.delta?.stop_reason && ev.delta.stop_reason !== 'tool_use') stop();
        }
        return;
      }
      if (e.type === 'assistant') {
        for (const block of e.message?.content ?? []) {
          if (block.type !== 'tool_use' || block.name !== 'Skill') continue;
          const name = normalize(String(block.input?.skill ?? ''), opts.set);
          const bucket = SKILLS.includes(name) ? out.loaded : out.other;
          if (!bucket.includes(name)) bucket.push(name);
        }
        return;
      }
      if (e.type === 'result') {
        out.costUsd = e.total_cost_usd ?? null;
        if (e.is_error && e.subtype !== 'error_max_turns') out.error = `${e.subtype}: ${String(e.result ?? '').slice(0, 200)}`;
      }
    };

    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        try {
          onEvent(JSON.parse(line));
        } catch {
          // not a JSON line, ignore
        }
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => {
      clearTimeout(timer);
      out.error = `could not start claude: ${err.message}`;
      done(out);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (!stopped && code !== 0 && !out.error) out.error = `claude exited ${code}: ${stderr.trim().slice(0, 200)}`;
      if (out.calls === 0 && !out.error) out.error = `no model response: ${stderr.trim().slice(0, 200)}`;
      done(out);
    });
  });
}

function grade(testCase, run) {
  const allowed = new Set([...testCase.expect, ...(testCase.also_ok ?? [])]);
  const missed = testCase.expect.filter((s) => !run.loaded.includes(s));
  const extra = run.loaded.filter((s) => !allowed.has(s));
  return { missed, extra, pass: !run.error && missed.length === 0 && extra.length === 0 };
}

const list = (a) => (a.length ? a.join(', ') : 'none');
const pct = (n, d) => (d === 0 ? '  n/a' : `${((100 * n) / d).toFixed(0).padStart(4)}%`);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const all = JSON.parse(readFileSync(join(HERE, 'cases.json'), 'utf8'));
  for (const c of all) {
    const names = [...c.expect, ...(c.also_ok ?? [])];
    const bad = names.filter((s) => !SKILLS.includes(s));
    if (bad.length) fail(`case ${c.id} names unknown skills: ${bad.join(', ')}`);
  }
  const cases = pickCases(all, opts);
  if (!cases.length) fail('no cases match');
  if (opts.set === 'portable' && !existsSync(join(REPO, 'skills', 'portable'))) fail('skills/portable is missing. Run node scripts/build.mjs first.');

  const workdir = mkdtempSync(join(tmpdir(), 'skill-triggers-'));
  const cwd = join(workdir, 'empty-project');
  mkdirSync(cwd);
  const pluginDir = opts.set === 'portable' ? buildPortablePlugin(workdir) : null;

  console.log(`set: ${opts.set}   cases: ${cases.length} of ${all.length}   concurrency: ${opts.concurrency}`);
  const disabled = opts.set === 'claude' ? userDisabledSkills() : [];
  if (disabled.length) {
    console.log(`note: ~/.claude/settings.json turns these off under skillOverrides: ${disabled.join(', ')}`);
    console.log('      They are switched on for the test runs only. In your own sessions they cannot load.');
  }
  console.log('');

  const results = new Array(cases.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < cases.length) {
      const i = cursor++;
      const run = await runCase(cases[i], opts, cwd, pluginDir);
      const verdict = grade(cases[i], run);
      results[i] = { case: cases[i], run, ...verdict };
      const tag = run.error ? 'ERROR' : verdict.pass ? 'pass ' : 'FAIL ';
      const others = run.other.length ? `   (also: ${run.other.join(', ')})` : '';
      console.log(`${tag} ${cases[i].id.padEnd(30)} expected: ${list(cases[i].expect).padEnd(40)} loaded: ${list(run.loaded)}${others}`);
      if (run.error) console.log(`      ${run.error}`);
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(opts.concurrency, cases.length) }, worker));
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }

  const graded = results.filter((r) => !r.run.error);
  console.log('\nPer skill (a load listed under also_ok counts neither for nor against)');
  console.log(`${'skill'.padEnd(22)} expected  loaded  missed  false  precision  recall`);
  for (const s of SKILLS) {
    const expected = graded.filter((r) => r.case.expect.includes(s));
    const tp = expected.filter((r) => r.run.loaded.includes(s)).length;
    const fn = expected.length - tp;
    const fp = graded.filter((r) => r.extra.includes(s)).length;
    console.log(`${s.padEnd(22)} ${String(expected.length).padStart(8)}  ${String(tp).padStart(6)}  ${String(fn).padStart(6)}  ${String(fp).padStart(5)}  ${pct(tp, tp + fp).padStart(9)}  ${pct(tp, tp + fn).padStart(6)}`);
  }

  const misses = graded.filter((r) => r.missed.length);
  const falses = graded.filter((r) => r.extra.length);
  const errors = results.filter((r) => r.run.error);
  console.log(`\nMisses (${misses.length})`);
  for (const r of misses) console.log(`  ${r.case.id}: did not load ${r.missed.join(', ')}   loaded: ${list(r.run.loaded)}\n      "${r.case.prompt}"`);
  console.log(`\nFalse triggers (${falses.length})`);
  for (const r of falses) console.log(`  ${r.case.id}: loaded ${r.extra.join(', ')}   expected: ${list(r.case.expect)}\n      "${r.case.prompt}"`);
  if (errors.length) {
    console.log(`\nErrors (${errors.length})`);
    for (const r of errors) console.log(`  ${r.case.id}: ${r.run.error}`);
  }

  const usage = results.reduce((t, r) => {
    for (const k of Object.keys(t)) t[k] += r.run.usage[k];
    return t;
  }, { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 });
  const calls = results.reduce((n, r) => n + r.run.calls, 0);
  const passed = results.filter((r) => r.pass).length;
  const model = results.find((r) => r.run.model)?.run.model ?? 'unknown';
  console.log(`\n${passed}/${results.length} cases passed   model: ${model}   model calls: ${calls}`);
  console.log(`tokens: ${usage.input} input, ${usage.cacheWrite} cache write, ${usage.cacheRead} cache read, ${usage.output} output`);

  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify({
      date: new Date().toISOString(), set: opts.set, model, calls, usage, passed, total: results.length,
      results: results.map((r) => ({ id: r.case.id, expect: r.case.expect, also_ok: r.case.also_ok ?? [], loaded: r.run.loaded, other: r.run.other, missed: r.missed, extra: r.extra, pass: r.pass, error: r.run.error, calls: r.run.calls, usage: r.run.usage })),
    }, null, 2));
  }
  process.exit(errors.length ? 2 : passed === results.length ? 0 : 1);
}

main();
