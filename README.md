# ai-agent-skills

Skills and a global rules file for Claude Code and every other agent. Built to stop re-explaining the same context in every session.

> **August 2026: this repo moved off the old flat-file methodology entirely** and onto Anthropic's native Agent Skills format. It's not a refactor of the old approach, it's a different mechanism for the same goal. The previous version (`CLAUDE.md` plus flat `skills/*.md` files, wired together with hand-written routing lines) is gone. The live system is everything below.

---

## Structure

```
CLAUDE.md                                     global config, loads on every session
AGENTS.md                                     the same rules for every other agent, plus a skill index (generated)
skills/claude/apple-platform/SKILL.md         iOS / iPadOS / macOS      (SwiftUI, Liquid Glass)
skills/claude/android-platform/SKILL.md       Android                   (Jetpack Compose, M3 Expressive)
skills/claude/web-platform/SKILL.md           Web                       (Next.js, Astro, Supabase)
skills/claude/motion-design/SKILL.md          Animation                 (all platforms, GSAP, Three.js)
skills/claude/rust-conventions/SKILL.md       Rust                      (services, CLIs, audio, FFI)
skills/claude/backend-conventions/SKILL.md    Railway backend services  (API servers, workers, cron; non-Next.js)
skills/claude/figma-design-system/SKILL.md    Figma design systems      (process, gates, token naming)
skills/claude/visual-styles/SKILL.md          15 visual styles          (all platforms)
skills/claude/color-system/SKILL.md           Curated color library     (Swiss + Bauhaus + modernist)
skills/claude/code-audit/SKILL.md             Audit checklists

skills/portable/                              the same skills for other agents (generated)
skills/bundled/                               one self-contained file per topic (generated)
scripts/build.mjs                             builds portable/, bundled/ and AGENTS.md
scripts/check.mjs                             lint, plus a check that the generated files are current
checks/                                       compiles every code sample, per language
```

Each skill directory also holds `reference/*.md` files for anything too deep to keep in the top-level `SKILL.md`; API detail, per-style implementations, per-platform code (Claude reads those only when the task actually needs them).

---

## Why this changed shape

This repo used to be flat files (`APPLE.md`, `STYLES.md`, etc.) referenced by hand-written routing lines in `CLAUDE.md`, "when working on Apple UI, read apple.md before writing any view code." That predates Anthropic's Agent Skills format and it was the only mechanism that existed at the time. A skill was a file, and the only way Claude knew to read it was being told to, explicitly, every time. As of 2026 Claude Code discovers and loads skills on its own: every skill's `name` and `description` sit in context by default (a few hundred tokens each), and Claude reads the full `SKILL.md`, and whichever `reference/*.md` files it actually needs, only once a task matches. A 2,000-line file that used to cost the same whether you needed one paragraph of it or all of it now costs nothing until the relevant paragraph is read.

The old version was retired outright rather than patched in place. Everything actually maintained lives under `skills/` and `CLAUDE.md` at the repo root.

Two consequences that shaped the new structure:

- **The manual routing lines are gone.** They're redundant with the discovery mechanism and can actively fight it. If a skill isn't triggering when it should, the fix is a sharper `description`, not a `CLAUDE.md` line telling Claude to read it. `CLAUDE.md` now holds only what's true on every task regardless of what Claude decides is relevant: stack, lane rules, platform target pins, and floor-level code/UI/motion/privacy rules. 
- **Every file over ~500 lines got split.** `SKILL.md` is the table of contents; the detail moved into topic-scoped `reference/` files one level deep (`visual-styles`, for instance, went from one 1,567-line file to a short `SKILL.md` plus one reference file per style). This is the biggest single quality change in this pass. It's the difference between Claude loading the whole Apple skill to answer a Liquid Glass question and loading only `reference/liquid-glass.md`.

---

## Who owns what

Every topic has one owner. The other skills point at it. They don't keep their own copy, because the copies drift.

| Topic | Owner |
| --- | --- |
| Motion token names and values | `motion-design` (`reference/cross-platform-tokens.md`) |
| Token naming, and the Figma path to CSS/Swift/Kotlin name conversion | `figma-design-system` (`reference/token-architecture.md`) |
| Palette values | `color-system` |
| Liquid Glass | `apple-platform`. The `visual-styles` file is a stub, the Figma file is Figma mechanics only. |
| Browser support status | `web-platform` (`reference/browser-compatibility.md`) |
| Supabase publishable key and SSR | `web-platform` |
| Supabase secret key, JWT verification | `backend-conventions` |
| Rust CI commands | `rust-conventions`. `code-audit` runs them, it doesn't redefine them. |
| Design-file gates and the minimum screen set | `figma-design-system` (`reference/gates.md`) |

Version numbers and anything else that moves fast live in one dated place per skill. Nowhere else.

---

## Skills

### `apple-platform`

iOS / iPadOS / macOS, SwiftUI only. Full Liquid Glass API surface (`.glassEffect()`, `GlassEffectContainer`, morphing, button styles, GPU/performance rules), semantic color and typography tokens, HIG motion, navigation patterns, design-file frame structures, custom rendering (SwiftUI Canvas, `Animatable`, `AttributedString`, Metal shader modifiers), and accessibility. OS versions and what changed between releases live in `reference/platform-status.md` so dated content never contaminates the stable reference.

### `android-platform`

Jetpack Compose, Material 3 Expressive, current stable Android. M3 color roles and dynamic color, Roboto Flex typography, shape morphing, spring-based `MotionScheme`, the M3E component set, edge-to-edge and window insets, adaptive layouts, Navigation 3, predictive back, custom rendering (Compose Canvas, AGSL shaders, `RenderEffect`). Library versions are pinned in one table in `SKILL.md`.

### `web-platform`

Semantic HTML, custom CSS, TypeScript, Next.js App Router (Cache Components, `"use cache"`, `proxy.ts`), Astro (content collections, server islands), and Supabase through `@supabase/ssr` with the Vercel/Railway lane rules enforced in actual code patterns. Advanced visual techniques (blend modes, clip-path, SVG, Canvas 2D), security headers, Core Web Vitals, WCAG 2.2. The largest skill in the library, split into reference files by subtopic. `reference/browser-compatibility.md` is the one answer to "is this safe to ship."

### `motion-design`

Cross-platform animation: the spring-vs-ease decision, duration bounds, and reduced-motion policy inline in `SKILL.md`, then per-platform reference files (SwiftUI, Compose, CSS/View Transitions, GSAP, Three.js core, Three.js shaders/particles). It defines the motion tokens every other skill uses. GSAP's plugin set (ScrollTrigger, SplitText, Flip, MorphSVG) is fully free now, no license key needed.

### `figma-design-system`

My opinionated design-system process, not MCP tool mechanics. It explicitly defers mechanical `use_figma`/`get_design_context` call syntax to the installed `figma:figma-use` plugin skills rather than duplicating them. Carries the four hard gates for design-file work: dark canvas first, no empty pages/frames plus the minimum screen set (Auth, Home w/ 4 states, Detail, Settings, Nav shell), token names must match the codebase, both light and dark mode required. `reference/gates.md` has the reasons and how the gates scale, from a full system build down to a one-off edit. Also the single definition of token naming for the whole library. Figma plan gates, limits, and tool names are dated in `reference/platform-status.md`.

### `visual-styles`

15 distinct visual languages (Neo-Minimalism, Neo-Brutalism, Brutalism Pure, Liquid Glass, Glassmorphism, Neumorphism, Claymorphism, Kinetic Typography, Futuristic/Sci-Fi, Bento Grid, Editorial/Structural, Organic/Biomorphic, Texture/Tactile, Retro Computing, Calm/Anti-Distraction), each with its own reference file: Visual Signature, "Wrong if" checklist, token modifications, component rules, accessibility, and iOS/Android/Web implementation code. `SKILL.md` only routes. Each style file is self-contained, so one style loads one file.

### `color-system`

Named primitives from Swiss International Style poster design and the Bauhaus primary triad, plus a mid-century palette and warm/cool neutral ramps. Semantic light/dark tokens, pairing rules, WCAG contrast ratios. The values are in `reference/palette.md`; writing them as CSS, SwiftUI, or Compose tokens is `reference/implementation.md`. This is a curated *palette*. It decides which colors, not how color spaces work. A project's own palette or a chosen visual style overrides it, and so will TASTE.md once it's built.

### `code-audit`

Report-only audit checklist in six categories: code, UI/design-system coherence, audio thread, security, Figma file handoff, and the Rust toolchain gates. One severity scheme (critical, warning, minor) and one report format. It finds and reports. It doesn't fix unless asked.

### `rust-conventions`

Extends CLAUDE.md's floor rules (no bare `unwrap()`, `thiserror`/`anyhow` split, no `clone()`-to-dodge-the-borrow-checker) with the operational layer: edition/toolchain pinning, CI gates, async/Tokio discipline, the axum/sqlx/tower web stack with Supabase JWT verification, `tracing` observability, realtime audio-thread crates, testing, project structure, a crate selection guide with a dated version snapshot, and a Rust audit checklist.

### `backend-conventions`

Standalone Railway backend work that isn't behind a Next.js route: API servers, background workers, cron jobs, queue consumers. Covers health checks, graceful shutdown (SIGTERM/draining), deploy config as Infrastructure as Code in `.railway/railway.ts`, the Supabase secret-key admin client and why RLS-bypass is safe here per the lane rules, verifying user JWTs against the JWKS, Postgres connection modes, cron vs worker vs queue with retry and idempotency, and structured logging. Explicitly defers to `rust-conventions` when the language is Rust, and to `web-platform`'s Supabase integration reference for anything inside the Next.js request cycle. This skill exists for everything outside both of those.

---

## Other agents

`skills/claude/` is the source. It's the only folder I edit. Two more are built from it, so every agent gets the same rules without a second copy to keep in sync.

- **`skills/portable/`** is for agents that find skills by their descriptions. Same skills, Agent Skills spec fields only, with the Claude-specific wording swapped out.
- **`skills/bundled/`** is for agents that don't, or that won't follow a pointer from one skill to another. Local and personal models, mostly. Every topic file stands alone: the skill's rules, the topic, and whatever it needs from other skills copied in. Load one file, not the folder. `skills/bundled/INDEX.md` lists them.
- **`AGENTS.md`** is `CLAUDE.md` for everyone else, with a skill index at the bottom for agents that need a routing table.

Don't edit the generated files. Edit `skills/claude/` or `CLAUDE.md`, then:

```bash
node scripts/build.mjs    # rebuild portable/, bundled/ and AGENTS.md
node scripts/check.mjs    # lint, and fail if anything generated is stale
```

Wording that has to differ for other agents goes in `scripts/portable.json`, not in the output. CI runs the check on every push.

---

## Checks

Every code sample in the skills goes through a real compiler. The checks read the samples straight out of the markdown each run, so there's no second copy to drift.

```
checks/swift/        every Swift sample, iOS and macOS SDKs          needs Xcode 27.2
checks/kotlin/       every Compose sample as an Android library      needs a JDK and the Android SDK
checks/rust/         every Rust sample through the skill's CI gates  needs rustup, Postgres, three cargo tools
checks/typescript/   every TS and TSX sample under strict tsc        needs Node
checks/javascript/   GSAP, Lenis and Three.js samples, motion tokens needs Node
checks/color/        palette, semantic mappings, contrast figures    needs Node
checks/triggers/     which skill loads for a given request
```

Each one is `checks/<name>/run.sh`, and `run.sh --self-test` proves it fails on a broken sample. Each folder's README says what it needs installed. Tokens come from the skill that owns them, so a sample that uses a token nobody defines fails.

CI runs them on every push that touches a skill. The Rust check also runs weekly, because `cargo audit` and `cargo deny` read the live advisory database and can go red without anyone touching the repo.

When a check fails, fix the skill, not the check.

---

## Setup

Each skill is a self-contained directory. Personal skills go under `~/.claude/skills/`; project-only skills go under `.claude/skills/` in a given repo.

```bash
mkdir -p ~/.claude/skills
for s in skills/claude/*; do ln -s "$PWD/$s" ~/.claude/skills/; done
cp CLAUDE.md ~/.claude/CLAUDE.md
```

The skills are symlinks, so edits here are live with nothing to re-copy. `cp -r skills/claude/* ~/.claude/skills/` works too, but it only adds and overwrites: a retired skill stays installed until you delete it by hand.

For another agent, link `skills/portable/*` into wherever it reads skills and give it `AGENTS.md`:

```bash
mkdir -p ~/.codex/skills
for s in skills/portable/*; do ln -s "$PWD/$s" ~/.codex/skills/; done
cp AGENTS.md ~/.codex/AGENTS.md
```

For a model with no skill support at all, there's nothing to install. Give it `AGENTS.md` as its system prompt or rules file, then hand it the one file from `skills/bundled/` that matches the task. `skills/bundled/INDEX.md` says which file covers what.

CLAUDE.md loads automatically on every session. Skills load automatically when Claude judges them relevant to the current task, no manual routing required. Run `/skills` in Claude Code at any point to see what's currently discoverable.

---

## Stack

- **Frontend**: Vercel (Next.js, SSR, proxy)
- **Backend**: Railway (API servers, workers, long-running processes)
- **Data/Auth**: Supabase (Postgres, Auth, RLS, Realtime, Storage)
- **Native**: SwiftUI (iOS/iPadOS/macOS), Jetpack Compose (Android)
- **Design**: Figma
- **Languages**: Swift, Kotlin, TypeScript, Rust

Stack is defined in CLAUDE.md. If yours differs, update the Lane Rules section. Everything else transfers.

---

