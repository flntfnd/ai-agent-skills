# Futuristic / Sci-Fi

Dark surfaces, neon accents that glow, grids as foreground elements, data-visualization aesthetics applied to UI. HUDs and command consoles, refined and usable.

**When to use**: Developer tools, security and monitoring dashboards, high-end fintech, assistant and agent products, gaming-adjacent apps; anywhere technical sophistication is on-brand.

**Not to be confused with**: Retro Computing (nostalgic, lo-fi, scanlines, one phosphor color; this is crisp, forward-looking, multi-accent), Glassmorphism (blurred translucent panels; here panels are opaque with luminous edges), a generic dark theme (neutral grey, no glow, no grid, no mono data).

## Visual Signature

Identifiable at a glance by: a near-black, slightly blue background, neon accents that emit glow, visible grid lines at low opacity, monospace data readouts, angular minimal chrome. It should feel like a command center.

**Structural requirements:**
- Background: deep near-black with a hue, not neutral dark grey.
- Glow: borders, active states, and key data emit light, layered as a tight bright core plus a wide faint halo.
- Cards: 1px accent border at 15-20% opacity, fill one step lighter than the page, radius 0-4px. Hover and focus brighten the border to full accent and add glow.
- Data: monospace with tabular figures for numbers, IDs, timestamps, status. Labels small, uppercase, tracked.
- Grid: a line grid or dot matrix at 5-8% opacity as a background layer.
- Accent budget: one primary neon and one secondary. Glow marks what is live or important.

**Wrong if:** the background is neutral dark grey, nothing glows, type is all proportional sans with no mono data treatment, cards are standard rounded cards with no edge treatment, corners exceed 4px, or glow is so widespread it signals nothing.

## Token Modifications

```
color/semantic/background/primary   → #0A0A0F (near black, slight blue)
color/semantic/background/secondary → #12121A
color/semantic/background/elevated  → #1A1A28
color/semantic/text/primary         → #E8E8F0
color/semantic/text/secondary       → #8888A8 (5.8:1)
color/semantic/text/disabled        → #4A4A6A (2.3:1: grid labels and inactive ticks only, never content)
color/semantic/interactive/primary  → #00F5D4 (cyan-teal neon)
color/semantic/accent/secondary     → #A855F7 (electric purple)
color/semantic/status/warning #F59E0B   status/error #EF4444
color/semantic/border/default → interactive/primary at 15-20%
color/semantic/border/focus   → interactive/primary at 100%

effect/glow/sm 0 0 8px   md 0 0 16px   lg 0 0 32px   xl 0 0 64px   (accent at 30-80%, stacked)
grid line: interactive/primary at 5-8%
radius: 0-4px
motion: fast and standard ease tokens for state changes. Live indicators pulse on a slow 2-4s loop.
dark-native: the app stays dark regardless of system appearance.
```

## Component Rules

- Primary buttons glow on hover and focus.
- Pulsing is a status signal for live indicators: one or two per screen.
- Progress bars fill with a gradient from transparent to accent.
- Grid lines are visible design elements, not hidden guides.
- Keep glow off body and small text: bloom destroys edge definition. Headings, key figures, and controls only.

## Accessibility

- Glow isn't a focus indicator. Focus is a solid accent outline; glow may accompany it.
- Status is never color alone: pair warning and error with a glyph or label.
- Saturated cyan on saturated purple vibrates. Never set one as text on the other.
- Pulses and animated grids stop under Reduce Motion.
- If a light variant is required, design it as a separate palette (pale cool grey, accent lines without glow). Don't invert.

## Platform Implementation

Signature technique: bloom. Layered CSS or shadow glow is enough for product UI; hero and canvas scenes need real bloom post-processing or neon looks flat (Three.js bloom pass, grid shader plane, additive particles: see `motion-design`).

**iOS / SwiftUI**
```swift
struct Glow: ViewModifier {
    let color: Color
    let radius: CGFloat

    func body(content: Content) -> some View {
        content
            .shadow(color: color.opacity(0.8), radius: radius / 2)
            .shadow(color: color.opacity(0.4), radius: radius)
            .shadow(color: color.opacity(0.2), radius: radius * 2)
    }
}

struct StatusReadout: View {
    let value: String

    var body: some View {
        Text(value)
            .fontDesign(.monospaced)
            .monospacedDigit()
            .foregroundStyle(Color.Semantic.Interactive.primary)
            .modifier(Glow(color: Color.Semantic.Interactive.primary, radius: GlowRadius.sm))
            .preferredColorScheme(.dark)
    }
}
```
For true bloom use a Metal shader through `.layerEffect()`; draw the grid in a `Canvas`.

**Android / Compose**
```kotlin
val accent = MaterialTheme.colorScheme.primary
Text(
    text = value,
    color = accent,
    style = MaterialTheme.typography.labelLarge.copy(
        fontFamily = FontFamily.Monospace,
        fontFeatureSettings = "tnum"
    ),
    modifier = Modifier
        .dropShadow(shape, Shadow(radius = glowSm, color = accent, alpha = 0.8f))
        .dropShadow(shape, Shadow(radius = glowMd, color = accent, alpha = 0.4f))
        .dropShadow(shape, Shadow(radius = glowLg, color = accent, alpha = 0.2f))
)
```
Pass the dark scheme regardless of `isSystemInDarkTheme()`, dynamic color off. An AGSL shader gives true bloom on API 33+.

**Web**
```css
:root {
  color-scheme: dark;
  --effect-glow-sm: 0 0 8px  color-mix(in oklch, var(--color-semantic-interactive-primary) 80%, transparent);
  --effect-glow-md: 0 0 16px color-mix(in oklch, var(--color-semantic-interactive-primary) 40%, transparent);
  --effect-glow-lg: 0 0 32px color-mix(in oklch, var(--color-semantic-interactive-primary) 20%, transparent);
  --grid-line: color-mix(in oklch, var(--color-semantic-interactive-primary) 6%, transparent);
}
.glow-text { text-shadow: var(--effect-glow-sm), var(--effect-glow-md), var(--effect-glow-lg); }
.grid-bg {
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: var(--grid-size) var(--grid-size);
}
.panel:hover, .panel:focus-within { border-color: var(--color-semantic-border-focus); box-shadow: var(--effect-glow-sm); }
.readout { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
```
