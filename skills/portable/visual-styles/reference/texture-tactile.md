# Texture / Tactile

Grain, noise, paper, fabric. Surfaces that feel like physical material. A reaction to the sterile perfection of flat design and machine-generated imagery: texture signals that something was made by hand. Use it with restraint. A few percent of grain makes a flat field dimensional.

**When to use**: Brands that trade on craft, print, food, music, culture, independent publishing. As the project's style, material is the identifier. A faint grain inside Neo-Minimalism, Organic, Editorial, or Neo-Brutalism is an accent and doesn't make the project Texture / Tactile.

**Not to be confused with**: Neo-Minimalism (warm and clean; grain optional and nearly invisible), Neumorphism and Claymorphism (extruded or inflated geometry, smooth surfaces), Retro Computing (scanlines and heavy noise on a screen, not on paper).

## Visual Signature

Identifiable at a glance by: surfaces that read as paper, linen, card stock, or concrete. Not photorealistic, but clearly not flat digital. Grain is on every surface, different surfaces carry different amounts, and color looks printed rather than emitted.

**Structural requirements:**
- Global grain: a noise layer over the page background at 3-5%. Without it the style isn't applied.
- Surface differentiation: at least two intensities. Page 3-5%, cards and raised surfaces 6-10%, one hero surface up to 18%. Material, not shadow or border, separates surfaces.
- Color: warm or earthy, slightly desaturated, off-white and off-black. Pure saturated color fights the texture.
- Typography: humanist sans or serif, crisp, set on top of the grain.
- Print artefacts (misregistration, halftone, rough edges) in small doses.

**Wrong if:** surfaces are flat colors or clean gradients, every surface carries identical grain (one global filter is an accent, not this style), grain hurts text legibility, or it reads as a clean flat design in warm colors.

## Token Modifications

```
texture/grain/opacity
  light  0.03-0.05  page background
  medium 0.06-0.10  cards, raised surfaces
  heavy  0.12-0.18  one hero surface, never under body text
texture types: grain (fine monochrome noise), paper (fiber), canvas (weave), linen (diagonal weave)
texture/blend: multiply on light surfaces, overlay or soft-light on mid and dark

color/semantic/background/primary → paper (#F4EFE6)
color/semantic/text/primary       → ink (#2B2622)
palette pulled 10-15% toward warm grey ("printed")
radius: 2-8px     shadow: short and soft, like a sheet on a table, or none
motion: none on the texture
```

## Component Rules

- Texture belongs to surfaces, never to text or icons.
- One light layer covers the page; surfaces add their own heavier layer. No more than two texture layers over any text.
- Separate surfaces by material and tone. No gloss, glass, or neon.
- Buttons are flat ink fills or outlines, like print. Pressed darkens the fill.
- Grain is static. Animated grain is a film effect and a different style.
- Texture tiles seamlessly at device resolution. Blurry upscaled noise reads as a bug.

## Accessibility

- Grain lowers effective contrast. Measure text contrast with the texture on and keep body text well above 4.5:1.
- Increase Contrast removes texture layers over text surfaces.
- Texture layers are decorative: no pointer events, hidden from assistive tech, never the only signal of a state or boundary.

## Platform Implementation

Signature technique: the grain IS the style. Procedural or tiled noise composited over every surface at differentiated intensities.

**iOS / SwiftUI**
```swift
struct Grain: ViewModifier {
    let opacity: Double
    @Environment(\.colorSchemeContrast) private var contrast

    func body(content: Content) -> some View {
        content.overlay {
            if contrast != .increased {
                Image("grain")
                    .resizable(resizingMode: .tile)
                    .blendMode(.multiply)
                    .opacity(opacity)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
    }
}
```
A small seamless tile renders correctly at every scale. A Metal noise shader through `.colorEffect()` is the procedural alternative.

**Android / Compose**
```kotlin
val grain = ImageBitmap.imageResource(R.drawable.grain_tile)
val brush = remember(grain) {
    ShaderBrush(ImageShader(grain, TileMode.Repeated, TileMode.Repeated))
}
Modifier.drawWithContent {
    drawContent()
    drawRect(brush = brush, alpha = grainMedium, blendMode = BlendMode.Multiply)
}
```
A tiled bitmap shader is cheap on every API level; an AGSL turbulence shader is the procedural route on API 33+. Never generate noise per frame.

**Web**
```css
:root {
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
body::after, .textured::after {
  content: '';
  inset: 0;
  background: var(--grain);
  mix-blend-mode: multiply;
  pointer-events: none;
}
body::after { position: fixed; opacity: var(--texture-grain-light); }
.textured { position: relative; isolation: isolate; }
.textured::after { position: absolute; border-radius: inherit; opacity: var(--texture-grain-medium); }
@media (prefers-contrast: more) { body::after, .textured::after { display: none; } }
```
`stitchTiles` makes the noise tile without seams. Keep to one fixed page layer plus per-surface layers, and never animate them.
