---
name: visual-styles
description: Reference for 15 deliberate visual design languages applied as overrides of native platform defaults on iOS, iPadOS, macOS, Android, and Web -- Neo-Minimalism, Neo-Brutalism, Brutalism (Pure), Liquid Glass, Glassmorphism/Frosted glass, Neumorphism/Soft UI, Claymorphism, Kinetic Typography, Futuristic/Sci-Fi/HUD, Bento Grid, Editorial/Structural, Organic/Biomorphic, Texture/Tactile/grain, Retro Computing (Y2K, CRT, terminal, retro window chrome), and Calm/Anti-Distraction. Use when a UI, screen, mockup, component, or design system needs an explicit named style instead of the native look, when choosing between styles, or when checking that an implementation reads as its style. Each style has one reference file: visual signature, tokens, component rules, "wrong if" checklist, accessibility, and SwiftUI, Compose, and CSS code. Load only the chosen style's file.
when_to_use: Trigger phrases: "make this neo-brutalist," "glassmorphism card," "bento grid layout," "retro CRT terminal look," "Y2K terminal," "claymorphism button," "soft UI," "kinetic type hero," "grainy paper texture," "calm distraction-free reader."
---

# Visual Styles

Visual design languages for iOS, iPadOS, macOS, Android, and Web. This file routes. The detail is in one reference file per style.

## How to Use This File

The styles here are explicit overrides. They're chosen deliberately and applied intentionally. They aren't defaults.

**When no style is specified, the correct answer is native.** iOS apps look like Apple built them: Liquid Glass, SF Pro, Apple HIG. Android apps look like Google built them: Material 3 Expressive, dynamic color, Roboto Flex. Native isn't a style -- it's the baseline every style here intentionally departs from.

When a style IS specified, a project has exactly one. Pick it before touching tokens. The token architecture stays constant; the style's reference file says how to populate it.

**Applying a style isn't a token swap.** Changing colors and font weights while keeping the same component structure, layout rhythm, and spacing logic is repainting, not applying a style. Each style requires structural changes: different component patterns (cards vs lists vs raw type), different layout logic (tight grid vs breathing room vs confrontational density), different interaction behavior (press-collapse vs hairline hover vs none). If a Neo-Brutalism and a Neo-Minimalism build share a component structure and differ only in variables, Neo-Brutalism hasn't been applied.

The test: if someone sees a thumbnail and can't immediately name the style, the implementation is wrong. Read the chosen file's Visual Signature first. Fix structure before tokens.

**Loading pattern.** Identify the style below, then load that one reference file and nothing else from this skill. Every file has the same sections in the same order: Visual Signature (structural requirements, "Wrong if"), Token Modifications, Component Rules, Accessibility, Platform Implementation (signature technique, then one sample each for iOS / SwiftUI, Android / Compose, Web).

All three platforms are first-class targets for every style except Liquid Glass, which is an Apple system material.

Native: platform APIs only. No web views, no PNGs standing in for an effect. Web: CSS custom properties, Grid and Flexbox, native browser APIs. No canvas for effects CSS handles, no JavaScript for animation CSS handles.

**Tokens come from their owners.** Style files say how a style modifies tokens; they don't define a parallel system.
- Color: names follow `color/semantic/<group>/<role>` (CSS `--color-semantic-<group>-<role>`, SwiftUI `Color.Semantic.<Group>.<role>`, Compose `MaterialTheme.colorScheme`), as defined in `figma-design-system`. Palette construction is `color-system`.
- Motion: token names and values are `motion-design` (`reference/cross-platform-tokens.md`). Style files name the token and state only how the style deviates.
- Web support status is `web-platform` (`reference/browser-compatibility.md`). Write for evergreen browsers. Gate only what that file says to gate.
- Samples reference tokens. The names are illustrative. The rule isn't: nothing hardcoded in a view.

**Color values are placeholders.** Reasonable defaults for the style, not my palette. A project taste file, if present, overrides them. Replacements still have to meet the contrast figures in each file.

## Quick Reference

| Style | Visual signature (one line) | Reference |
| --- | --- | --- |
| 1. Neo-Minimalism | Warm off-white breathing room, light serif display type, no boxed containers, hairline dividers | [neo-minimalism.md](reference/neo-minimalism.md) |
| 2. Neo-Brutalism | Hard offset flat shadows, thick black borders, brand-color fills, press-collapse interaction | [neo-brutalism.md](reference/neo-brutalism.md) |
| 3. Brutalism (Pure) | Extreme two-size type scale, solid ink rules, no shadows, no radius, no fills, near-monochrome | [brutalism-pure.md](reference/brutalism-pure.md) |
| 4. Liquid Glass | Apple's system glass on the navigation layer, refracting content beneath (Apple platforms only) | [liquid-glass.md](reference/liquid-glass.md) |
| 5. Glassmorphism / Frosted | A few blurred translucent panels over a rich background, light highlight stroke, opaque fallback | [glassmorphism.md](reference/glassmorphism.md) |
| 6. Neumorphism / Soft UI | One base color everywhere, depth from paired light and dark shadows, no borders | [neumorphism.md](reference/neumorphism.md) |
| 7. Claymorphism | Inflated pastel elements, inner highlight and shade, soft colored shadow, large radii | [claymorphism.md](reference/claymorphism.md) |
| 8. Kinetic Typography | Oversized display type as the layout, character/word/line stagger reveals on scroll or entry | [kinetic-typography.md](reference/kinetic-typography.md) |
| 9. Futuristic / Sci-Fi | Blue-black background, layered neon glow, monospace readouts, visible low-opacity grid, angular chrome | [futuristic-scifi.md](reference/futuristic-scifi.md) |
| 10. Bento Grid | Variably-sized rounded tiles on shared tracks, size encodes importance, one featured brand-color cell | [bento-grid.md](reference/bento-grid.md) |
| 11. Editorial / Structural | Visible multi-column grid, serif headlines over dense body text, hairline rules as structure, no cards | [editorial-structural.md](reference/editorial-structural.md) |
| 12. Organic / Biomorphic | Irregular blob silhouettes, asymmetric layout, soft nature-palette gradients, slow motion | [organic-biomorphic.md](reference/organic-biomorphic.md) |
| 13. Texture / Tactile | Grain on every surface at differentiated intensities, warm desaturated "printed" palette | [texture-tactile.md](reference/texture-tactile.md) |
| 14. Retro Computing | One committed era: phosphor terminal with scanlines, bevelled window chrome, or early web | [retro-computing.md](reference/retro-computing.md) |
| 15. Calm / Anti-Distraction | Extreme whitespace, three colors, near-invisible navigation, opacity-only motion | [calm-anti-distraction.md](reference/calm-anti-distraction.md) |

## Telling Neighbors Apart

The pairs that get confused, and the deciding trait. Each file's "Not to be confused with" line covers the rest.

- **Neo-Brutalism vs Brutalism (Pure)**: saturated fills and hard offset shadows vs no fills, no shadows, document flow.
- **Neo-Minimalism vs Calm vs Editorial**: sparse with brand personality vs chrome and color suppressed so only content remains vs dense, multi-column, rule-heavy.
- **Liquid Glass vs Glassmorphism**: system material on an Apple app's navigation layer vs blurred content panels, and any glass on Web or Android.
- **Futuristic vs Retro Computing**: crisp, forward-looking, multi-accent glow vs a lo-fi period screen.
- **Neumorphism vs Claymorphism**: elements that match the background, shaped by paired shadows vs inflated elements with their own pastel fill.
- **Texture / Tactile vs a grain accent**: differentiated material on every surface vs one faint global layer inside another style.
- **Bento vs a card grid**: unequal tiles where size means importance vs equal tiles.

## Cross-Style Rules

These hold for every style on every platform. Reference files add only what is style-specific.

**Platform conventions are non-negotiable.** Style is a visual language over correct platform behavior. A neo-brutalist iOS app still swipes back. A futuristic Android app still uses Material navigation and predictive back. Style changes appearance, not behavior.

**Web gets the same design completeness as native.** Every screen, state, and breakpoint: Mobile (375-767), Tablet (768-1023), Desktop (1024+).

**Accessibility doesn't negotiate.**
- Contrast: 4.5:1 for normal text; 3:1 for large text, icons, and the boundaries of interactive elements. Where a style's look works against that, its file says how to compensate, and the compensation is part of the style.
- Focus: always visible, a solid outline with offset (the system focus ring on native). Never the style's own effect alone (glow, shadow, inversion).
- State is never carried by color alone.
- Text is real text, never an image. Web has semantic structure and full keyboard navigation. Layout survives 200% zoom and the platform's text-size settings.
- Hit targets: 44pt on iOS, 48dp on Android, whatever the silhouette.
- Flashing stays under three per second. Anything that moves by itself for more than five seconds can be paused.

**User preferences win over the style.** Reduce Motion, Reduce Transparency, and Increase Contrast each get a defined fallback wherever a style uses motion, translucency, or low-contrast decoration (SwiftUI `accessibilityReduceMotion`, `accessibilityReduceTransparency`, `colorSchemeContrast`; Android animator duration scale; CSS `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`). Every animated element has a non-animated equivalent carrying the same information.

**Dark mode is required**, by system preference on native and `prefers-color-scheme` on web. It's a separately designed palette, not an inversion. Exception: dark-native styles (Futuristic, the terminal schemes of Retro Computing) stay dark regardless of system appearance.

**States are complete.** Default, hover, pressed, focused, disabled, loading, error, empty, each in the style's own idiom (collapse on Neo-Brutalism, inset on Neumorphism, squish on Claymorphism, inversion on Brutalism). The style changes what states look like, not which exist.

**Motion follows `motion-design`.** Springs for motion the user drives, ease tokens for motion the system starts, never linear for UI transitions (scroll-linked timelines excepted). Each style file says which tokens it uses and where it departs: Neo-Brutalism snappy, Organic slow with no bounce, Calm fades only, Brutalism and Retro Computing instant or stepped.

## Related Skills

This skill doesn't load these; name the ones a task needs up front. Beyond the token owners above: `apple-platform` owns Liquid Glass, SwiftUI Canvas, and Metal shader modifiers; `android-platform` owns Material 3 theming, Compose Canvas, AGSL, and RenderEffect; `motion-design` also covers GSAP, Three.js, and shaders.
