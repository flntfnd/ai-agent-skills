---
name: color-system
description: Curated historical color palette drawn from Swiss International Style poster design (Muller-Brockmann, Hofmann, Ballmer, 1950s-1970s) and the Bauhaus primary triad (Itten), plus a mid-century modernist palette and warm/cool neutral ramps for interfaces. Provides 73 named primitives with hex and OKLCH values (swiss-red, swiss-blue, bauhaus-yellow, warm-500, accent-blue-light), light and dark semantic tokens, pairing rules (red+black, blue+yellow, black+yellow), restraint guidance, and computed WCAG 2 contrast ratios. Use when picking colors for a design system or brand, choosing a primary or accent color, building a Swiss-style, Bauhaus, poster-inspired, or modernist palette, naming color primitives, mapping primitives to semantic tokens, checking whether palette colors pair or pass contrast, or writing these colors as CSS (oklch, light-dark, color-mix), SwiftUI, or Compose tokens. Covers which colors to choose, not general color-space technique. A project's own palette or an active visual style overrides it.
---

# Color System

My color library. It comes from the Swiss International Style (1950s-1970s) and the Bauhaus primary palette, the movements that shaped modern graphic design. Their color choices weren't arbitrary. They were deliberate statements about what color does in service of communication.

This answers *which* colors to choose. Color mechanics live elsewhere: OKLCH in `web-platform`, system semantic colors in `apple-platform`, Material color roles and dynamic color in `android-platform`.

**It's a foundation, not a prescription.** Pull named primitives from it. Don't invent hex values from nothing. It fills the gaps where I haven't specified a preference yet.

When several sources apply, this is the order:

1. Colors specified in the project's design files or an existing project palette.
2. A `TASTE.md` file, when the project has one. I haven't built one yet.
3. Token modifications from an explicitly chosen style in the `visual-styles` skill.
4. This library.

On Apple platforms and Android, with no style specified, the default is the platform's own semantic or dynamic color, not this palette. Use this library when a brand or custom palette is actually being chosen.

## Quick Reference

| Need | Where |
| --- | --- |
| All 73 primitives with hex and OKLCH, grouped by family, plus source notes | [reference/palette.md](reference/palette.md) |
| Writing the palette as tokens: CSS (`oklch()`, `light-dark()`, relative color, `color-mix()`, `contrast-color()`), wide gamut, SwiftUI, Compose, and the state of contrast standards | [reference/implementation.md](reference/implementation.md) |
| Semantic mappings, pairing rules, restraint, contrast | This file |

## How to Use

Token naming comes from `figma-design-system` (`reference/token-architecture.md`) and is the same in every skill. This skill decides which primitive each name points to.

```
Primitive   color/primitive/swiss-red              --color-primitive-swiss-red
Semantic    color/semantic/interactive/primary     --color-semantic-interactive-primary
                                                   Color.Semantic.Interactive.primary
```

Components never use a primitive directly. They go through semantic tokens, so a theme or mode change is a remap, not a find-and-replace. If the codebase already names a token differently, the codebase's name wins.

## The Palette at a Glance

Four families, 73 primitives. Full tables are in [reference/palette.md](reference/palette.md).

```
Swiss International Style
  swiss-red      #D52B1E    swiss-blue     #1B4499    swiss-yellow   #F5C900
  swiss-green    #1B6B3A    swiss-orange   #E05C1A    swiss-cyan     #0097A7
  swiss-ochre    #865D07    swiss-ink      #1A1A1A    swiss-pure-white #FFFFFF
  + warm/deep/bright variants of each hue and a 9-step achromatic set

Bauhaus (Itten)
  bauhaus-red    #C8302A    bauhaus-yellow #E8C018    bauhaus-blue   #1E3878
  + black, gray, and orange/green/violet secondaries

Mid-century modernist
  modernist-red  #E0272A    modernist-blue #1C5CB2    modernist-yellow #F2C200
  + green, orange, teal, brown, cream

Contemporary (interface ramps)
  warm-100 .. warm-950      #FAFAF7 .. #1A1614
  cool-100 .. cool-950      #F8F9FA .. #0E1014
  accent-{red,blue,yellow,green,orange,cyan}-light for dark surfaces,
  plus accent-red-lighter and accent-red-lightest
```

One name per value. `warm-200` is the Swiss paper tone, `warm-100` is the near-white, and Bauhaus white is `swiss-pure-white`.

## Semantic Mappings

Which primitive each `color/semantic/<group>/<role>` token aliases when no style is active. The groups are fixed. A state is a suffix on its role.

```
Token                              Light             Dark
background/primary                 warm-200          cool-900
background/elevated                warm-100          cool-800
background/sunken                  warm-300          cool-950

text/primary                       swiss-ink         cool-100
text/secondary                     warm-700          cool-500
text/disabled                      warm-500          cool-600
text/inverse                       warm-100          swiss-ink

border/default                     warm-400          cool-700
border/strong                      swiss-ink         cool-300
border/subtle                      warm-300          cool-800

interactive/primary                swiss-red         accent-red-light
interactive/primary-hover          bauhaus-red       accent-red-lighter
interactive/primary-pressed        swiss-red-deep    accent-red-lightest
interactive/primary-disabled       warm-500          cool-700

status/error                       swiss-red-deep    accent-red-light
status/warning                     swiss-ochre       swiss-yellow
status/success                     swiss-green       accent-green-light
status/info                        swiss-blue        accent-blue-light

accent/primary                     swiss-blue        accent-blue-light
accent/secondary                   swiss-yellow      swiss-yellow
```

- `interactive/primary` can be `swiss-blue` instead, per brand.
- `text/inverse` is the label on every `interactive/primary` state, in both modes.
- Light states get darker. Dark states get lighter. Both step the same way through default, hover, pressed.
- `status/*` works as text and as a mark in both modes. One exception: on dark `background/elevated`, error, success and info are marks or large text only.
- Dark `status/info` is blue, not cyan. Info is blue in light mode and a role keeps its hue across modes. Cyan stays an accent.
- `accent/*` is decorative. It's never the only thing carrying meaning and never an interactive state. `accent/secondary` is yellow, so it's a fill or a large shape with `swiss-ink` on top, never text on a light surface.
- `swiss-yellow` is still the warning fill in light mode when the warning is a banner or badge: yellow background, `swiss-ink` text. `status/warning` is for the mark and the text.

## Color Pairing Logic

The Swiss Style used color in systematic relationships, not arbitrary combinations. These pairings come from the posters.

### Primary pairings (two-color compositions)

```
Red + Black            Classic. Muller-Brockmann road safety posters. Maximum force.
Red + White            Swiss flag composition. Clean, forceful.
Blue + White           Maritime, institutional. Hofmann school.
Blue + Yellow          Maximum chromatic contrast. Use sparingly. Bauhaus triad.
Black + Yellow         Warning/signal. Extremely high contrast. Use for critical states.
Black + White          The Swiss Style baseline. Typography first.
Red + Yellow           Energetic. Less common in Swiss design than Bauhaus.
```

### Restraint (Swiss discipline)

The Swiss Style used two or three colors per composition. I hold UI to the same rule:

- One primary brand color (red, blue, or yellow)
- Black and white as the structure
- Optional: one secondary neutral (warm gray or cool gray)

Don't use all the accent colors at once. If everything is emphasized, nothing is. Status colors are the exception. They're functional signals, not part of the composition, and they only appear when a state calls for them. `accent/*` is optional. Most screens don't need it.

## Contrast

These are WCAG 2 relative-luminance ratios, computed from the palette values. Normal text needs 4.5:1 for AA and 7:1 for AAA. Large text (24px, or 18.66px bold, and up) and the visible boundaries of UI components and meaningful graphics need 3:1. Disabled controls and decorative elements have no requirement.

```
Light. Ratios on background/primary / elevated / sunken (warm-200 / warm-100 / warm-300)

text/primary                  swiss-ink         15.69 / 16.64 / 14.38
text/secondary                warm-700          5.16 / 5.47 / 4.73
border/strong                 swiss-ink         15.69 / 16.64 / 14.38
status/error                  swiss-red-deep    6.13 / 6.50 / 5.62
status/warning                swiss-ochre       5.29 / 5.61 / 4.84
status/success                swiss-green       5.90 / 6.25 / 5.41
status/info                   swiss-blue        8.12 / 8.61 / 7.44
accent/primary                swiss-blue        8.12 / 8.61 / 7.44

Dark. Ratios on background/primary / elevated / sunken (cool-900 / cool-800 / cool-950)

text/primary                  cool-100              16.19 / 12.51 / 18.06
text/secondary                cool-500              6.65 / 5.14 / 7.42
border/strong                 cool-300              13.40 / 10.36 / 14.96
status/error                  accent-red-light      4.76 / 3.68 / 5.31
status/warning                swiss-yellow          10.75 / 8.31 / 12.00
status/success                accent-green-light    4.79 / 3.70 / 5.34
status/info                   accent-blue-light     5.40 / 4.17 / 6.02
accent/primary                accent-blue-light     5.40 / 4.17 / 6.02

Labels. text/inverse on each interactive fill

interactive/primary           light swiss-red       4.79    dark accent-red-light     4.85
interactive/primary-hover     light bauhaus-red     5.13    dark accent-red-lighter   6.28
interactive/primary-pressed   light swiss-red-deep  6.50    dark accent-red-lightest  8.32

Fills against the surface they sit on (3:1 needed)

interactive/primary           light 4.14 min   dark 3.68 min
interactive/primary-hover     light 4.44 min   dark 4.76 min
interactive/primary-pressed   light 5.62 min   dark 6.30 min
```

Every text, status, and label token passes 4.5:1 on `background/primary` in both modes. Every interactive fill clears 3:1 against every background.

Other pairings worth knowing:

```
swiss-ink on swiss-yellow                 10.97   ✓ the warning fill
swiss-blue on swiss-yellow                 5.67   ✓
warm-100 on swiss-blue                     8.61   ✓
warm-100 on swiss-red-warm                 4.14   ✗ large text only
swiss-red on warm-200 / warm-100 / warm-300   4.52 / 4.79 / 4.14   body text fails on warm-300
swiss-red on swiss-black                   3.95   ✗ large text / UI only
swiss-red-warm on swiss-black              4.58   ✓
accent-red-light on swiss-black            5.52   ✓
swiss-orange on warm-200                   3.31   ✗ large text / UI only
swiss-cyan on warm-200                     3.16   ✗ large text / UI only
swiss-yellow on warm-200                   1.43   ✗ fails at any size
accent-cyan-light on cool-900              7.09   ✓
accent-orange-light on cool-900            6.04   ✓
warm-400 on warm-200 (border/default)      1.25   decorative
cool-700 on cool-900 (border/default)      2.17   decorative
```

The rules that come out of the numbers:

- **Yellow is a fill, never text or a mark on a light surface.** Background with `swiss-ink` on top, or text on dark surfaces only. On light surfaces the warning mark and text are `swiss-ochre`.
- **Red as text has no margin on light neutrals.** `swiss-red` passes for body text on `warm-100` and `warm-200` and fails on `warm-300`. That's why `status/error` is `swiss-red-deep`. On near-black use `swiss-red-warm` or `accent-red-light`.
- **`swiss-red-warm` isn't a state color.** It drops a `warm-100` label to 4.14:1.
- **Dark elevated surfaces are the tight spot.** `accent-red-light`, `accent-green-light` and `accent-blue-light` are 3.68:1, 3.70:1 and 4.17:1 on `cool-800`. Marks and large text only there. Set the message in `text/primary`.
- **Default borders are decorative.** Where a border is the only thing identifying a control, like an input field, use `border/strong`.
- **Color is never the only signal.** Error, warning, and success get an icon or text alongside the color.

Compute any pairing that isn't listed here before using it. Don't estimate by eye.
