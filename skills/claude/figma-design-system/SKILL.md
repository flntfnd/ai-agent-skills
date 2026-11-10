---
name: figma-design-system
description: Process for building Figma design systems (iOS/iPadOS/macOS, Android, Web) on the official Figma MCP server and plugin skills, and the single definition of design token naming for the whole skill library. Covers the four hard gates checked every session (dark canvas first, no empty pages plus the minimum screen set per platform, token names match the codebase exactly, light and dark both required), the session start sequence, three-tier tokens, token families and the mechanical Figma-to-CSS/Swift/Kotlin name conversion, variable collections, modes, code syntax, component inventory and states, interactive-state wiring, Slots, building Liquid Glass in Figma, applying a visual style, replicating a live app, Dev Mode and Code Connect handoff, and dated Figma plan gates, limits, and tool names. Does not cover MCP call syntax -- the figma:figma-use and related plugin skills own that.
when_to_use: Use when starting, resuming, extending, or auditing a Figma design file, design system, component library, or screen set; creating Figma variables, tokens, components, or screens; naming a design token on any platform; reskinning or replicating a UI in Figma; preparing a Figma file for handoff; or deciding whether design work is done.
---

# Figma Design Systems

How I build design systems in Figma for iOS/iPadOS/macOS, Android, and Web, on top of the official Figma MCP server. Every single value is a variable. Styles are for composites built from variables: text styles, effect styles, gradient paint styles. Solid color styles are legacy.

**MCP tool calls** belong to the plugin skills that ship with the Figma plugin (`figma:figma-use`, `figma:figma-generate-library`, `figma:figma-generate-design`, and siblings). Figma maintains them. Load them alongside this one. On mechanics the plugin skill wins. On process and completeness this one does.

## Quick Reference

| Topic | Reference |
| --- | --- |
| Token naming for every skill: tiers, families, conversion rule per platform, code syntax; variable collections, modes, typography, spacing, radius | [reference/token-architecture.md](reference/token-architecture.md) |
| Component and state lists, Auto Layout, properties, Slots, mandatory interactive-state wiring | [reference/component-architecture.md](reference/component-architecture.md) |
| Building Liquid Glass in Figma: Apple's kit, parameters, glass tokens, API limits | [reference/liquid-glass.md](reference/liquid-glass.md) |
| Applying a visual style to an existing design (restructure, not a token swap) | [reference/applying-styles.md](reference/applying-styles.md) |
| Build-from-scratch and replicate-an-app order of operations, file structure, Dev Mode handoff, accessibility, anti-patterns | [reference/workflows-and-handoff.md](reference/workflows-and-handoff.md) |
| The four gates in full, how they scale with the task, the minimum screen set per platform | [reference/gates.md](reference/gates.md) |
| Figma facts that change: plan gates, limits, beta status, MCP tool and skill names, kit links, dated | [reference/platform-status.md](reference/platform-status.md) |

## Gates

Four rules, mine, checked at session start and all the way through. They fail quietly and cost the most at handoff.

1. **Dark canvas first.** Every page's canvas is `#1E1E1E` before any content exists. If it's white, stop and fix it.
2. **No empty pages or frames.** Create it, populate it fully, move on. A platform isn't complete without the minimum screen set.
3. **Token names match the codebase exactly.** Use the names already shipping. Don't invent new ones.
4. **Light and dark, both.** Every semantic color has both values and every screen is built and reviewed in both before it's complete.

A full build gets all four in full. A small edit to an existing file just can't leave the file worse, and anything already broken gets reported, not silently fixed. [reference/gates.md](reference/gates.md) has the reasons, the scaling rules, and the minimum screen set.

In Figma:

**Dark canvas:**
```javascript
figma.currentPage.backgrounds = [{
  type: 'SOLID',
  color: { r: 0.118, g: 0.118, b: 0.118 },  // #1E1E1E
  opacity: 1
}];
```
`figma.currentPage` is one page. Repeat per page using the page-switching rule in `figma:figma-use`, and set it on every new page as it's created. By hand: right-click empty canvas → Background color. Take a screenshot and look.

**No empty pages.** Create a page in the same step that populates it. If a 🎨 Tokens page exists, the variable collections are on it before the 🎛 Components page is touched.

**Token names.** The variable path and each variable's code syntax follow [reference/token-architecture.md](reference/token-architecture.md). Where the codebase already names a token, that name wins.

**Light and dark.** Light and Dark modes on the Semantic Color collection. Review every screen with its top frame set to each.

## Lanes

This skill has Figma process and token names. Values and platform rules come from the skill that owns them.

| Need | Owner |
| --- | --- |
| The four gates and the minimum screen set | This skill ([reference/gates.md](reference/gates.md)) |
| Palette values and which primitive each semantic role aliases | `color-system` |
| Apple type sizes, system colors, the Liquid Glass rule and look, OS versions | `apple-platform` |
| Material color roles, shape scale, window size classes, library versions | `android-platform` |
| Web tokens in CSS, breakpoints in code | `web-platform` |
| Motion token names and values | `motion-design` |
| The style catalog | `visual-styles` |

## Session Start

1. Load `figma:figma-use` and the plugin skill for the job: `figma-generate-library` for tokens and components, `figma-generate-design` for screens, `figma-design-to-code` before reading a design for implementation.
2. Open a session. `create_session` with the file key and a one-line task, before any other file tool, read-only work included. New file: `create_new_file` first, then `create_session`.
3. Read before writing. An existing file has pages, collections, and conventions. Find them before adding to it.
4. Check the gates, scaled to the task.

## Design Style

Confirm the visual style with the `visual-styles` skill before building any tokens or components. With no style specified, the platform's own design language is the default. Token tiers, component structure, Auto Layout and state wiring stay the same across styles. Only values and structural specifics change. [reference/applying-styles.md](reference/applying-styles.md) has how a style gets applied in Figma.

## Philosophy

The design system is a contract between design and code. Tokens defined in Figma are the same tokens used in SwiftUI, Compose, and CSS. Names, values, and hierarchy match across all three. A design system built without engineering as an audience is a sticker sheet.

Design everything. Every screen, every state, every edge case. Empty, loading, error, partial content, overflow, long text, short text, disabled. A design that covers only the happy path is a mood board. Engineering will invent the missing states in code, and they'll be wrong.

Pixel perfect means exactly that. Bind everything to variables, measure everything. A component that's 17px wide because it "looks about right" isn't pixel perfect.

## Two Modes of Work

**Building from scratch.** Design system first, components second, screens last. Tokens are defined before a single component is touched.

**Replicating an existing app.** Audit first, extract the implicit system, formalize it, then rebuild components on the formalized tokens. Never skip the audit.

Both are step by step in [reference/workflows-and-handoff.md](reference/workflows-and-handoff.md).
