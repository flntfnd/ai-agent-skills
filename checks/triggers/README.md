# Trigger tests

Does the right skill load for a request a real person would type? An agent decides from `name`, `description` and `when_to_use` alone, so this is a test of those three fields.

- `cases.json`: 87 requests, each with the skills that should load.
- `run.mjs`: runs them through Claude Code and reports what loaded.
- `RESULTS.md`: the last recorded run, with a diagnosis for every failure.

## How it works

Each case is one headless Claude Code session:

```
claude -p "<prompt>" --output-format stream-json --verbose --tools Skill
```

The runner reads the event stream and records every `Skill` tool call the model makes (`tool_use`, `name: "Skill"`, `input.skill`). That call is the real loading mechanism, not a stand-in for it. The session starts in an empty temp directory, with your user settings, plugins, and `~/.claude/CLAUDE.md` in place, so the ten skills compete with everything else you have installed.

A case passes when every skill in `expect` loaded and nothing else from the library loaded, apart from skills listed in `also_ok`. Skills from outside the library (the Figma plugin's, for example) are printed and ignored.

Claude Code documents three other routes. None fit as well:

- `claude plugin eval` has a `tool_used: Skill` grader, but it targets a plugin with a manifest and runs it in a sandbox with nothing personal loaded. These are personal skills, and the point is to see them trigger among your other skills. It also runs each case three times plus a no-plugin baseline.
- `/skill-doctor` reports listing cost and how often each skill was used. It doesn't run prompts.
- A `PreToolUse` hook matching `Skill` sees the same call the stream shows. The stream needs no setup.

Docs: [headless mode](https://code.claude.com/docs/en/headless), [skills](https://code.claude.com/docs/en/skills), [plugin evals](https://code.claude.com/docs/en/plugin-evals), [hooks](https://code.claude.com/docs/en/hooks).

## What it costs

Every case is at least one real model call on your account, and one more per skill loaded. The full list was 87 cases and 167 calls on the last run. Each session also writes about 21k tokens of system prompt and skill listing to the prompt cache, and sessions don't share that cache, so input is the real cost: 1.85M cache-write tokens for the full list. So the default run is small: 12 cases spread across the list. The runner stops each session as soon as the model starts answering in prose, which keeps output tokens low.

## Run it

```bash
node checks/triggers/run.mjs                      # 12 cases, spread across the list
node checks/triggers/run.mjs --only motion-design # the cases that expect one skill
node checks/triggers/run.mjs --only none          # the negatives
node checks/triggers/run.mjs --id edge-glass-web  # one case
node checks/triggers/run.mjs --limit 30           # 30 cases, evenly spaced
node checks/triggers/run.mjs --all                # everything
node checks/triggers/run.mjs --all --set portable # skills/portable instead
```

Other options: `--model`, `--concurrency` (default 4), `--max-turns` (default 6), `--timeout`, `--json <path>`.

Exit code: 0 when every case passed, 1 when a case failed, 2 when a run errored.

`--set claude` tests what's installed in `~/.claude/skills`, so the symlinks from the main README have to be there. `--set portable` wraps `skills/portable` in a throwaway plugin, loads it with `--plugin-dir`, and switches the installed ten off for that run. The skills then show up as `portable:<name>`, which the runner strips.

The runner passes `skillOverrides` for the ten skills on the command line. If your `~/.claude/settings.json` turns any of them off, it says so at the top of the run and tests them anyway. Your settings file isn't touched.

## What it can't tell you

- Whether the skill did its job once loaded. This stops at the load.
- Anything certain from one run. The model isn't deterministic. Run a failing case a few more times with `--id` before you rewrite a description.
- How the skills trigger inside a real project. The session has an empty directory and only the `Skill` tool. A real session has files and may read them before it reaches for a skill.
- How another model behaves. Results belong to the model that ran them, printed at the end.
- Whether a description was cut. Claude Code truncates the listing at 1,536 characters per skill and drops descriptions when the whole listing goes over budget. A dropped description looks like a miss here.

## Add a case

Add an object to `cases.json`:

```json
{
  "id": "edge-short-name",
  "prompt": "What the person would actually type.",
  "expect": ["skill-that-must-load"],
  "also_ok": ["skill-that-may-load"],
  "note": "Who owns this and why, in one line."
}
```

- Write the prompt the way you'd type it. Don't paraphrase the description and don't use the skill's name.
- `expect: []` is a negative. Nothing from the library should load.
- Put a skill in `also_ok` when loading it is harmless. Leave it out when loading it means the border is wrong.
- Run the new case alone with `--id` before you commit it.

## Run the cases against another agent

Nothing here drives Codex or a local model. Do it by hand:

1. Install the portable set where the agent reads skills, and give it `AGENTS.md`:

   ```bash
   mkdir -p ~/.codex/skills
   for s in skills/portable/*; do ln -s "$PWD/$s" ~/.codex/skills/; done
   cp AGENTS.md ~/.codex/AGENTS.md
   ```

2. Start a fresh session in an empty directory for each case. Paste the `prompt` and nothing else.
3. Note which skills the agent opened. Read it off the transcript if the agent shows its file reads. If it doesn't, ask afterwards: "Which skill files did you read for that?"
4. Compare with `expect` and `also_ok`. Same rule: everything in `expect`, nothing outside both lists.

For a model with no skill support, paste the ten `name` and `description` pairs from `skills/portable/*/SKILL.md` above the prompt and ask which it would load. That's an approximation: it tests the wording, not the agent's loading. To print the pairs:

```bash
for f in skills/portable/*/SKILL.md; do sed -n '2,/^---$/p' "$f" | sed '$d'; echo; done
```

Start with `--only none` and the `edge-` cases. Borders are where agents differ.
