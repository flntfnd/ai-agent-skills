# TypeScript Sample Check

Type-checks every `ts`, `tsx` and `typescript` code fence under `skills/claude/`. The markdown is the source on every run. No sample text lives in this folder.

If a sample doesn't compile against the versions the skills name, this fails.

## Run It

```bash
checks/typescript/run.sh
checks/typescript/run.sh --self-test
```

Works from any directory. Needs Node 22.12 or newer and npm. The first run does `npm ci`.

The last line is the summary:

```
typescript: 39 samples checked (backend 16, web 23), 39 passed, 0 failed, 0 skipped: PASS
```

A failure prints the tsc errors, then one `FAIL` line per sample pointing back at the markdown file and line. The extracted file has one extra line at the top, so a tsc line number is the fence's line plus one.

`--self-test` injects a broken sample and passes only if the check catches it.

## How It Works

- `extract.mjs` writes each fence to `.build/<project>/`. A first line of `// app/items/actions.ts` is the destination, so samples can import each other the way the skill shows. A fence without one lands in the project root. Every sample gets `export {};` appended so it's a module.
- Two projects, two tsconfigs. `web/` is the strict config from web-platform with bundler resolution. `backend/` is the same flags with NodeNext, because those samples import with `.js` extensions.
- `web/stubs.d.ts` and `backend/stubs.d.ts` declare what the samples call but don't define. `backend/lib/database.types.ts` stands in for generated Supabase types. Keep them small. If a stub is growing, the sample is probably leaving out too much.
- `run.sh` runs `next typegen` before tsc, because `PageProps` only exists after Next generates route types.
- `report.mjs` turns the tsc logs into the summary line.

## Samples That Need Help

`samples.config.mjs` is the only place a sample gets special treatment. Skip one, move one, or wrap a fragment. Every skip needs a reason. Right now the table is empty.

A new skill with TypeScript fences fails the run until it's added to `projects` in that file. That's deliberate.

## Bumping a Version

When a skill's version snapshot changes:

1. Set the exact new version in `package.json`. No ranges.
2. Run `npm install` in this folder to rewrite `package-lock.json`.
3. Run `run.sh`. Fix the samples in the skill, not the stubs.
4. Commit `package.json` and `package-lock.json` together.

`.build/` and `node_modules/` are ignored.
