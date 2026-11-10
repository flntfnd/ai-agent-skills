# Gates

Four rules apply to every design file. Check them at session start and keep checking. They're not a kickoff ritual. Skipping one of them is the most common way a design session goes wrong here.

These are my rules. This file has the policy and the reasons. The Figma commands are in [SKILL.md](../SKILL.md#gates).

## 1. Dark canvas first

The canvas is dark before any content exists. Frame, component, token specimen, anything. Not optional, and not "polish later."

My products are dark-first. A design built on a white canvas reads wrong the moment it lands in one, and re-backgrounding afterwards means re-checking every color and shadow that assumed white.

Do it first, on every page. The canvas around all content is dark grey (`#1E1E1E`), never white. If it's white, stop and fix it.

## 2. No empty pages or frames, and the minimum screen set

Don't create a page or frame as a placeholder to fill later. Create it, populate it fully, move on. An empty container is a failure state, not a step. If a Tokens page or variable collection exists, it's fully populated before the Components page is touched.

**Minimum screen set per platform.** A platform isn't complete without all of it:

- **Authentication** -- login, signup, forgot password, verification
- **Home / main content** -- default, loading, empty, error states
- **Detail** -- item detail view with all content variants (full, partial, long text, short text)
- **Settings / profile**
- **Navigation** -- the nav shell in each of its states (collapsed, expanded, active tab)

"Key screens" means every targeted platform gets this full set. Not one platform. Not just a login screen. Every hardcoded value found while building these screens means a token is missing. Fix the token, not the instance.

This list is the only definition of the minimum screen set. Other files and skills point here.

## 3. Token names must match the codebase

If a platform app already exists, the token names in the design file match the names in code exactly. Read the platform skill first (`apple-platform`, `android-platform`, or `web-platform`) and use the names already shipping. Don't invent names that diverge from the codebase.

Mismatched names leave a design-to-code gap that someone bridges by hand on every handoff. This is the most expensive of the four because it fails quietly. A file with `purple-500` where code has `color/semantic/interactive/primary` looks fine in the tool and breaks at implementation.

If the codebase has no tokens yet, build them in the design file and let the file be the source of truth. Say so explicitly, so engineering treats the file as canonical and doesn't assume code came first.

## 4. Both light and dark mode

Every screen exists in both modes before the design is complete. Not as a follow-up pass. That's a Light and a Dark value on every semantic color token, and every screen built and reviewed in both. A token with two values that no screen was ever checked against in dark doesn't pass.

## Scaling the gates to the task

The gates define when a design is complete. They aren't a toll on every edit.

| Task | What applies |
| --- | --- |
| New file, new design system, or a platform's screen set | All four gates in full, in order. |
| New screen or component in an existing file | Gates 1, 3 and 4 for everything created, and nothing left empty (gate 2). The minimum screen set is owed only if the task is to complete that platform. |
| Small one-off edit to an existing file (fix a label, adjust one component, swap an icon) | Make the edit. Don't leave the file worse on any gate: no new hardcoded values, no new token names that diverge from code, both modes still correct for what was touched. |

On anything short of a full build, report violations that were already in the file. A white canvas on a page nobody asked about, a missing dark value on an unrelated token, an incomplete screen set. Don't fix them silently, and don't use them as a reason to refuse the edit. Rewriting a file beyond the request is its own failure. Fix them when I ask, or when the edit can't be done correctly without it.

## Why these four

They fail silently and expensively. A white canvas, an empty page, a mismatched token name, a missing dark pass all look like "still in progress," not "broken." Nothing forces a fix until handoff, when fixing costs the most.

Component completeness, state wiring, accessibility annotations and Figma technique are just as required. They're in the other reference files because they're mechanics, not policy.
