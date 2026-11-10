# Retro Computing

Nostalgia for the screens of early computing and the early internet: phosphor terminals, CRT scanlines, bevelled window chrome, hand-built web pages. The aesthetic is nostalgic; the craft is current.

This is terminals and early window chrome. The glossy chrome and translucent-plastic look people now call Y2K is a different thing and isn't here.

**When to use**: Niche apps, gaming-adjacent products, developer tools for an audience that has the reference, music and creative tools where retro is on-brand.

**Not to be confused with**: Futuristic / Sci-Fi (crisp, forward-looking, multi-accent neon with bloom; this is lo-fi and usually one phosphor color), Brutalism (Pure) (raw but era-less, no screen effects).

## Visual Signature

Identifiable at a glance by: one committed period reference plus at least one overtly retro structural element. Someone who lived through the era should feel it immediately.

**Structural requirements:**
- Commit to one era per product. Mixing them reads as costume.
  - **Terminal**: near-black background, one phosphor color (green or amber), monospace everywhere, scanlines at 5-8%, prompt (`>`) and block cursor. Scanlines are mandatory.
  - **Desktop chrome** (Windows 3.1 / 95 era): grey surfaces, two-tone bevels (light top-left, dark bottom-right), solid blue title bars, pixel-style UI type. The bevel is mandatory; scanlines optional.
  - **Early web**: default-looking serif body, link blue and visited purple, visible table borders, tiled backgrounds. Monospace only for code-like content.
- Structural element, at least one: bevelled chrome, blinking block cursor, terminal prompt, dithered imagery, a text boot sequence.
- Geometry: square corners, whole-pixel borders, no soft shadows, no gradient smoother than a dither.

**Wrong if:** the era is ambiguous or mixed, the terminal era lacks scanlines or uses proportional type, the chrome era lacks bevels, the palette is contemporary tech (dark grey, blue accent), shadows are soft, or corners are rounded like modern UI.

## Token Modifications

```
color schemes (pick one), as background/primary, text/primary, text/disabled:
  terminal green  #0A0A0A  #00FF41 (14.5:1)  #003B00 (decorative only)
  amber CRT       #0F0A00  #FF9900 (9.2:1)   #3D2400 (decorative only)
  blue screen     #0000AA  #AAAAAA (5.7:1)   accent #FFFFFF
  grayscale CRT   #1A1A1A  #D4D4D4           #888888 (4.9:1)
  desktop chrome  #C0C0C0 surface, #000000 text, #000080 title bar, bevel pair #DFDFDF / #808080

typography: monospace (JetBrains Mono, IBM Plex Mono, platform mono);
            display in a pixel font, as real text at whole multiples of its design size
effects:
  effect/scanline   period 4px, thickness 2px, color black at 5-8% (legibility breaks above 10%)
  crt-curve  vignette, optional slight barrel distortion at the edges
  noise      10-15% on imagery and backgrounds, not over text
radius: 0; one large radius only on a frame simulating the CRT glass
borders: 2-4px solid, two-tone bevels
motion: deviates from the motion-design set. Stepped or instant, never eased, no springs.
terminal schemes are dark-native.
```

## Component Rules

- Chrome-era buttons: raised bevel at rest, inverted bevel while pressed, label shifted 1px down-right. No transition.
- Terminal-era buttons: bracketed text such as `[ OK ]`.
- Selection and focus are inverse video (foreground and background swapped). Menus mark the current row with a full-width inverse bar.
- Dialogs are literal windows: title bar, 2px bevel frame.
- Imagery is dithered or reduced-palette with nearest-neighbor scaling.
- Screen effects are one overlay on the whole screen, never baked into components.

## Accessibility

- Scanlines and noise sit over text: stay inside the token range, offer the effects as a setting, and drop them under Increase Contrast.
- The only loop is a blinking cursor, and it stops under Reduce Motion. Flicker stays barely perceptible.
- Pixel lettering is a font, never an image. Use it for display and labels; long passages use the monospace.
- Monospace runs wide: measure near 60-70 characters, line height 1.5 or more.
- Typed-out text is in the accessibility tree in full immediately, and can be skipped.

## Platform Implementation

Signature technique: CRT post-processing. Minimum: scanline overlay plus monospace. Full: a screen-space shader with barrel distortion, chromatic aberration, scanlines, and phosphor tint, applied to imagery and backgrounds while text stays text (see `motion-design`).

**iOS / SwiftUI**
```swift
struct Scanlines: View {
    var body: some View {
        Canvas { context, size in
            var y: CGFloat = 0
            while y < size.height {
                context.fill(
                    Path(CGRect(x: 0, y: y, width: size.width, height: Effect.Scanline.thickness)),
                    with: .color(Effect.Scanline.color)
                )
                y += Effect.Scanline.period
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

struct TerminalScreen<Content: View>: View {
    @Environment(\.colorSchemeContrast) private var contrast
    @ViewBuilder var content: Content

    var body: some View {
        content
            .fontDesign(.monospaced)
            .foregroundStyle(Color.Semantic.Text.primary)
            .background(Color.Semantic.Background.primary)
            .overlay { if contrast != .increased { Scanlines() } }
            .preferredColorScheme(.dark)
    }
}
```
`.interpolation(.none)` on pixel art.

**Android / Compose**
```kotlin
Modifier.drawWithCache {
    val period = scanlinePeriod.toPx()
    onDrawWithContent {
        drawContent()
        var y = 0f
        while (y < size.height) {
            drawRect(scanlineColor, topLeft = Offset(0f, y), size = Size(size.width, period / 2))
            y += period
        }
    }
}
```
Apply once on the root container. `FontFamily.Monospace` across the type scale, `FilterQuality.None` on pixel art, the dark scheme regardless of system theme.

**Web**
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent 0 calc(var(--effect-scanline-period) / 2),
    var(--effect-scanline-color) calc(var(--effect-scanline-period) / 2) var(--effect-scanline-period)
  );
  pointer-events: none;
}
:focus-visible, ::selection {
  background: var(--color-semantic-text-primary);
  color: var(--color-semantic-background-primary);
}
.win-button {
  border: 2px solid;
  border-color: var(--bevel-light) var(--bevel-dark) var(--bevel-dark) var(--bevel-light);
  border-radius: 0;
}
.win-button:active { border-color: var(--bevel-dark) var(--bevel-light) var(--bevel-light) var(--bevel-dark); translate: 1px 1px; }
.pixel-art { image-rendering: pixelated; }
.cursor::after { content: '▋'; }
@media (prefers-reduced-motion: no-preference) {
  .cursor::after { animation: blink var(--blink-period) steps(1, end) infinite; }
}
@keyframes blink { 50% { opacity: 0; } }
@media (prefers-contrast: more) { body::after { display: none; } }
```
