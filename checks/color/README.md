# Color check

Keeps the `color-system` skill honest against its own palette. Everything is read from the markdown when it runs. Nothing is hardcoded here except the exception table.

## What it checks

- Every primitive in `reference/palette.md`: hex and OKLCH convert to each other exactly, names are unique, no two primitives share a hex, and the stated primitive count is right.
- Every primitive name used in `SKILL.md` and `reference/implementation.md` exists in the palette. Every hex or OKLCH literal in the samples matches its palette row.
- Every contrast figure printed in `SKILL.md` is recomputed from the palette with the WCAG 2 formula and has to match to the digits shown.
- Every semantic token meets its rule in light and dark: text, status and labels at 4.5:1, borders, accents and fills at 3:1.
- The semantic groups and roles are the ones `figma-design-system/reference/token-architecture.md` allows.
- No file under `skills/claude` references a primitive the palette doesn't have. Removed names can't come back.

## Exceptions

`exceptions.json` is the only place a deliberate exception lives. Each one has a reason. The contrast exemptions also carry the sentence from `SKILL.md` that grants them, and the check fails if that sentence disappears.

Project ramps named `<hue>-<step>` are allowed in other skills because `token-architecture.md` says so. A hue that belongs to this palette still has to exist in it.

## What it needs

Node 22 or newer. No packages.

## Run it

```bash
checks/color/run.sh
checks/color/run.sh --self-test
```

It prints one summary line and exits non-zero on any failure. `--self-test` copies the skill into `.build/`, writes a wrong contrast figure into the copy, and confirms the check catches it.
