# Trigger test results

## Run

- Date: 2026-11-10
- Command: `node checks/triggers/run.mjs --all`
- Set: `claude` (the ten skills installed in `~/.claude/skills`)
- Mechanism: headless Claude Code, `claude -p --output-format stream-json --verbose --tools Skill`. The runner records each `Skill` tool call in the stream. See README.md.
- Claude Code 2.1.322, model `claude-fable-5-2`
- Session: empty working directory, user settings and plugins loaded, MCP servers off. About 70 other skills were in the listing alongside these ten.

## Cost

- 87 cases, 167 model calls.
- Tokens: 494 input, 1,849,646 cache write, 2,034,314 cache read, 41,819 output.
- About $30 at list price. That's an extrapolation from one metered session ($0.36 for 19k cache-write tokens and 1.4k output tokens), not a billed figure. On a subscription it counts against plan usage.
- Not in those numbers: about 30 more calls for probes, a 4-case smoke run, three retries of the failing case, a 3-case `--set portable` check (3 of 3 passed), and two runs of the candidate wording below.

## Counts

86 of 87 passed. 1 miss, 0 false triggers, 0 errors.

| Skill | Expected | Loaded | Missed | False | Precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| android-platform | 7 | 7 | 0 | 0 | 100% | 100% |
| apple-platform | 7 | 7 | 0 | 0 | 100% | 100% |
| backend-conventions | 7 | 7 | 0 | 0 | 100% | 100% |
| code-audit | 7 | 7 | 0 | 0 | 100% | 100% |
| color-system | 6 | 6 | 0 | 0 | 100% | 100% |
| figma-design-system | 10 | 10 | 0 | 0 | 100% | 100% |
| motion-design | 9 | 9 | 0 | 0 | 100% | 100% |
| rust-conventions | 8 | 8 | 0 | 0 | 100% | 100% |
| visual-styles | 10 | 9 | 1 | 0 | 100% | 90% |
| web-platform | 9 | 9 | 0 | 0 | 100% | 100% |

- All 12 negatives loaded nothing: Python, git, SQL, Go, Django on Heroku, Flutter, Vue with Firebase, React Native, WinUI, Sketch.
- 4 of the 5 two-skill cases loaded both.
- Every border held. Supabase from a Next.js route loaded web-platform only. Supabase from a Railway worker loaded backend-conventions only. System colors in SwiftUI and Material roles in Compose didn't pull in color-system. "Look over my Rust" loaded rust-conventions without code-audit. "Run an audit on this Rust crate" loaded both. Token naming in CSS loaded figma-design-system with no Figma file mentioned.
- 35 cases allow extras through `also_ok`. 8 used one: figma-design-system on the Figma handoff check, web-platform on the Next.js page transition and on glass for a marketing site, android-platform on frosted Android cards, the Compose FAB animation and the Android claymorphism file, apple-platform on the Figma glass tab bar, motion-design on the Android shader background.

## Environment finding

Six of the ten are switched off on this machine. `~/.claude/settings.json` has `skillOverrides` set to `"off"` for android-platform, backend-conventions, color-system, motion-design, rust-conventions and web-platform. With that in place they aren't in the skill listing, and no wording can make them load. The runner switches them on for its own child sessions and prints a note. The settings file wasn't changed. Remove those six entries if the skills are meant to be live.

## Miss

### pair-kinetic-hero: visual-styles didn't load

Prompt: "Hero section with a giant headline whose words slide in one at a time as you scroll."
Expected visual-styles and motion-design. Loaded motion-design only. Same result on three retries, so it isn't noise.

Diagnosis: partly the case, partly the description.

motion-design claims the request outright. Its description ends:

> Use when implementing, reviewing, or specifying UI motion, transitions, springs, easing curves, scroll animations, parallax, shared-element or page transitions, kinetic typography, micro-interactions, or WebGL/WebGPU shader effects.

visual-styles asks for a style to be named:

> Use when a UI, screen, mockup, component, or design system needs an explicit named style instead of the native look

The prompt names no style. It describes Kinetic Typography by its motion alone, and every trigger phrase in visual-styles `when_to_use` is a style name or close to one ("kinetic type hero"). The other described-but-unnamed styles (thick outlines and hard shadows, unequal rounded tiles, whitespace with no chrome) all loaded visual-styles, because no other skill claims them. This one has a second owner, and that owner wins.

Loading motion-design alone still gives a working stagger reveal. What's lost is the style file's layout rule: the oversized type is the layout.

Recommended change, in `skills/claude/visual-styles/SKILL.md`, `when_to_use`:

Old:

```
"kinetic type hero," "grainy paper texture,"
```

New:

```
"kinetic type hero," "oversized headline that reveals word by word," "grainy paper texture,"
```

`when_to_use` goes from 240 to 288 characters. `description` stays at 869. Combined: 1,157, under 1,536.

Checked: a scratch copy of the skill with this wording, loaded as a plugin with the installed one switched off, loaded both visual-styles and motion-design on the same prompt, 2 runs of 2.

If you'd rather motion-design own this request alone, change the case instead: set `expect` to `["motion-design"]` and move visual-styles to `also_ok`. Don't do both.

## False triggers

None.

## Read this before trusting 86 of 87

- One run per case. A pass here is one sample.
- The session had only the `Skill` tool and an empty directory. With nothing else to do, the model reaches for a skill more readily than it might in a project full of files.
- One model. Rerun before relying on these numbers for another.
- `--set portable` got a 3-case check, not a full run.
