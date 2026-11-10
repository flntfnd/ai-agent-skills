# Implementing the Palette

How to write these primitives and semantic roles as tokens on each platform, and what the current color features do and don't solve. General color technique is in the `web-platform`, `apple-platform`, and `android-platform` skills. This is the part specific to shipping this palette.

## Status

Web support status lives in `web-platform/reference/browser-compatibility.md`. As of November 2026: `oklch()`, `color-mix()`, `color()`, and `light-dark()` are safe everywhere. Relative color syntax is Baseline (2024-09) and safe for current browsers. `contrast-color()` is Baseline only since 2026-04 and needs a fallback. `dynamic-range-limit` is Chromium only.

WCAG 2.2 is the normative contrast standard. WCAG 3 is a Working Draft whose contrast algorithm "is yet to be determined". It doesn't name APCA.

## Contents

- [Web: CSS Tokens](#web-css-tokens)
- [Deriving States](#deriving-states)
- [contrast-color()](#contrast-color)
- [Wide Gamut and HDR](#wide-gamut-and-hdr)
- [Apple: SwiftUI](#apple-swiftui)
- [Android: Compose](#android-compose)
- [Contrast Standards](#contrast-standards)

## Web: CSS Tokens

Names follow `figma-design-system/reference/token-architecture.md`: `--color-primitive-<name>` and `--color-semantic-<group>-<role>`. Primitives and semantics live in one `:root` block. Write primitives in OKLCH, with values from [palette.md](palette.md). Semantic tokens reference primitives and switch modes with `light-dark()`, which removes the duplicated dark-mode media query.

```css
:root {
    color-scheme: light dark;   /* required for light-dark() to resolve */

    --color-primitive-swiss-red: oklch(56.71% 0.2067 29.54);
    --color-primitive-bauhaus-red: oklch(54.87% 0.1896 27.76);
    --color-primitive-swiss-red-deep: oklch(49.34% 0.1857 27.49);
    --color-primitive-accent-red-light: oklch(64.93% 0.2141 28.23);
    --color-primitive-accent-red-lighter: oklch(71.05% 0.1777 28.37);
    --color-primitive-accent-red-lightest: oklch(78.11% 0.1239 28.63);
    --color-primitive-swiss-ink: oklch(21.78% 0 0);
    --color-primitive-warm-100: oklch(98.43% 0.0040 106.47);
    --color-primitive-warm-200: oklch(96.43% 0.0070 88.64);
    --color-primitive-warm-300: oklch(93.52% 0.0103 81.79);
    --color-primitive-warm-400: oklch(89.06% 0.0138 78.26);
    --color-primitive-warm-700: oklch(51.18% 0.0204 72.87);
    --color-primitive-cool-100: oklch(98.16% 0.0017 247.84);
    --color-primitive-cool-500: oklch(71.08% 0.0098 258.34);
    --color-primitive-cool-700: oklch(43.71% 0.0111 258.36);
    --color-primitive-cool-800: oklch(30.96% 0.0111 271.04);
    --color-primitive-cool-900: oklch(22.60% 0.0083 264.39);
    --color-primitive-cool-950: oklch(17.27% 0.0089 264.31);

    /* Semantic: light value, dark value */
    --color-semantic-background-primary: light-dark(var(--color-primitive-warm-200), var(--color-primitive-cool-900));
    --color-semantic-background-elevated: light-dark(var(--color-primitive-warm-100), var(--color-primitive-cool-800));
    --color-semantic-background-sunken: light-dark(var(--color-primitive-warm-300), var(--color-primitive-cool-950));
    --color-semantic-text-primary: light-dark(var(--color-primitive-swiss-ink), var(--color-primitive-cool-100));
    --color-semantic-text-secondary: light-dark(var(--color-primitive-warm-700), var(--color-primitive-cool-500));
    --color-semantic-text-inverse: light-dark(var(--color-primitive-warm-100), var(--color-primitive-swiss-ink));
    --color-semantic-border-default: light-dark(var(--color-primitive-warm-400), var(--color-primitive-cool-700));
    --color-semantic-interactive-primary: light-dark(var(--color-primitive-swiss-red), var(--color-primitive-accent-red-light));
    --color-semantic-interactive-primary-hover: light-dark(var(--color-primitive-bauhaus-red), var(--color-primitive-accent-red-lighter));
    --color-semantic-interactive-primary-pressed: light-dark(var(--color-primitive-swiss-red-deep), var(--color-primitive-accent-red-lightest));
}

.button {
    background: var(--color-semantic-interactive-primary);
    color: var(--color-semantic-text-inverse);
}
```

A manual theme toggle sets `color-scheme: light` or `color-scheme: dark` on the root, or on any subtree forced to one mode. Every `light-dark()` token below it follows.

## Deriving States

The palette defines hover and pressed states as named primitives. Use those. When a design calls for a state the palette doesn't name (a tint, a translucent overlay, a focus ring), derive it from a primitive and give the result a token. Don't invent a new literal.

```css
:root {
    /* Relative color: same hue and chroma, adjusted alpha */
    --color-semantic-interactive-primary-subtle: oklch(from var(--color-primitive-swiss-red) l c h / 0.12);

    /* color-mix: blend toward a surface, interpolating in OKLCH */
    --color-semantic-background-tinted: color-mix(in oklch, var(--color-primitive-swiss-red) 8%, var(--color-primitive-warm-200));
}
```

Mix and interpolate in OKLCH or OKLab, not sRGB. sRGB blends of saturated colors pass through muddy, darker midpoints. Same for gradients: `linear-gradient(in oklch, ...)`.

A derived color has a new contrast ratio. Compute it. The parent's ratio doesn't carry over.

## contrast-color()

`contrast-color(var(--some-fill))` returns `black` or `white`, whichever contrasts more with the input. It's for labels on user-chosen or data-driven fills. For this palette's fixed fills, use the explicit pairings in the contrast tables:

- It only returns pure black or white, not `swiss-ink` or `warm-100`.
- It guarantees the better of the two, not a passing ratio. On mid-tone fills neither option is comfortable, and several of this palette's reds sit there (`swiss-red-warm` gives 4.1:1 with white).
- It's recent, so it needs a declared fallback:

```css
.tag {
    background: var(--tag-color);
    color: var(--color-primitive-swiss-ink);  /* fallback */
    color: contrast-color(var(--tag-color));
}
```

## Wide Gamut and HDR

Every primitive in this library is inside sRGB and renders identically on sRGB and Display P3 screens. That's deliberate. The palette digitizes printed ink, which is less saturated than a P3 display can show.

A more saturated P3 variant is a new color and a design decision, not a conversion. If I ask for one, keep the primitive's lightness and hue, raise chroma, and scope it to capable displays so sRGB screens keep the original value:

```css
:root {
    --color-primitive-swiss-red: oklch(56.71% 0.2067 29.54);
}

@media (color-gamut: p3) {
    :root {
        --color-primitive-swiss-red: oklch(56.71% 0.24 29.54);   /* example chroma: get the real value from design */
    }
}
```

Raising chroma changes contrast slightly. Recompute. HDR has no role in this palette. Where HDR photography or video sits next to UI in these colors, `dynamic-range-limit` keeps the media from overpowering the interface, but it's Chromium only, so it's an enhancement.

## Apple: SwiftUI

Define each semantic color as a Color Set in the asset catalog with Any and Dark appearances, then expose it under the shared name. High Contrast variants live in the asset catalog too.

```swift
extension Color {
    enum Semantic {
        enum Background {
            static let primary = Color(.colorSemanticBackgroundPrimary)
        }
        enum Text {
            static let primary = Color(.colorSemanticTextPrimary)
        }
    }
}

Text("Title")
    .foregroundStyle(Color.Semantic.Text.primary)
    .background(Color.Semantic.Background.primary)
```

`.colorSemanticBackgroundPrimary` is the symbol Xcode generates for a color set of that name. Call sites use the `Color.Semantic` namespace.

Enter the palette's hex values with the color set's color space left at sRGB. They're sRGB values. Tag the same numbers as Display P3 and they render more saturated than specified. Use Display P3 in the asset catalog, or `Color(.displayP3, red:green:blue:opacity:)`, only for a color that was designed in P3.

On Apple platforms the default is the system's semantic colors, which also adapt to Increased Contrast and Liquid Glass. Use this palette for brand and accent roles when a custom palette has been chosen, and leave system backgrounds, labels, and separators to the system unless the design replaces them.

## Android: Compose

It's a fixed palette or dynamic color, not both. With no style specified, the Android default is dynamic color from the user's wallpaper and this library doesn't apply. When a brand palette is chosen, map the semantic roles onto Material color roles in one place:

```kotlin
private val SwissRed = Color(0xFFD52B1E)
private val SwissInk = Color(0xFF1A1A1A)
private val Warm200 = Color(0xFFF5F3EE)
private val Warm100 = Color(0xFFFAFAF7)
private val Warm400 = Color(0xFFE0DAD1)

val SwissLightColors = lightColorScheme(
    primary = SwissRed,
    onPrimary = Warm100,
    background = Warm200,
    onBackground = SwissInk,
    surface = Warm100,
    onSurface = SwissInk,
    outlineVariant = Warm400
)
```

Material derives many roles this library doesn't define: containers, tertiary, surface tones. Don't leave them at the baseline purple defaults. Map each one deliberately, or generate the full scheme from the chosen primary with Material Theme Builder and pin the roles this library does define.

## Contrast Standards

WCAG 2 contrast ratios, the numbers in SKILL.md, are the compliance measure. WCAG 2.2 is what laws and procurement rules reference.

APCA is a perceptual contrast model that accounts for font size, weight, and polarity. It was in early WCAG 3 drafts. The current draft leaves the algorithm undecided. It's fine as an extra design check, particularly for dark mode, but an APCA score isn't conformance to anything. A pair still has to meet its WCAG 2 ratio.

Contrast isn't the only requirement. Color is never the sole carrier of meaning (WCAG 1.4.1). Error, warning, and success states need an icon or text alongside the red, yellow, and green.
