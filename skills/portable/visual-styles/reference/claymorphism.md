# Claymorphism

Inflated forms. Elements look like soft clay or silicone pressed onto the page: fat, rounded, pastel, lit from the upper-left. Each element carries its own fill, an inner highlight, an inner shade, and a soft colored shadow underneath. Friendly and physical.

**When to use**: Onboarding, education, kids and family products, playful consumer apps, beginner-facing finance. Use it on high-touch elements: buttons, toggles, knobs, tiles, illustration-led cards. Not for dense or professional tools.

**Not to be confused with**: Neumorphism (elements share the background color and are extruded from it; clay elements have their own fill and stand off the background, so there's no single-base-color rule and no built-in contrast problem), Texture / Tactile (grain on flat geometry; clay is smooth and gets its feel from volume), Organic / Biomorphic (irregular silhouettes; clay is regular rounded geometry, inflated).

## Visual Signature

Identifiable at a glance by: puffy pastel elements with large radii on a pale background, each with a light inner highlight top-left, a darker inner shade bottom-right, and a soft shadow in its own color below. Nothing is flat and nothing is sharp.

**Structural requirements:**
- Fill: every clay element has its own pastel fill, different from the background.
- Inner highlight: an inset light shadow on the top-left edge. X 3, Y 3, blur 6, white at 60%.
- Inner shade: an inset darker shadow on the bottom-right edge. X -4, Y -4, blur 8, the fill darkened 15%.
- Outer shadow: soft, offset downward, tinted with the element's own fill. Y 12, blur 24, fill at 40%. Never grey, never black.
- Radius: 24-40px on cards and tiles, full pill on buttons.
- Background: one pale neutral or tint. It stays flat so the clay reads as volume.
- One light direction across the product: upper-left.

**Wrong if:** elements share the background color (that's Neumorphism), a fill is flat with no inner highlight and shade, the outer shadow is grey, black, or hard-edged, any radius is under 20px, fills are saturated, neon, or dark, borders define the shapes, or the whole screen is clay with no flat surface to rest on.

## Token Modifications

```
color/semantic/background/primary  → pale neutral or tint (#F3F0FA)
color/semantic/text/primary        → dark ink (#2B2540), also the text color on every fill
color/semantic/interactive/primary → the strongest pastel, primary actions
color/semantic/accent/primary, secondary, tertiary → pastel fills
  peach #FFC9B5   mint #B8E6D0   lilac #CDBBF5   sky #B5D8FF
  ink on these is 8.3:1 to 10.6:1; white on them is 1.4:1 to 1.7:1

shadow/clay-highlight: inset 3px 3px 6px white at 60%
shadow/clay-shade:     inset -4px -4px 8px fill darkened 15%
shadow/clay-outer:     0 12px 24px fill at 40%
radius: 24-40px on cards and tiles, pill on buttons
typography: rounded sans, Medium to Bold
motion: press squishes (scale 0.96) on the expressive spring token
```

## Component Rules

- Buttons squish on press: scale down, outer shadow shortens. Release springs back.
- Selected state changes the fill to `interactive/primary` and adds a glyph. Volume alone isn't a state.
- Clay sits on flat surfaces. Don't nest clay inside clay more than one level.
- Icons and illustrations follow the same volume and light direction, or stay flat ink. Never thin outline icons.
- A handful of clay elements per screen. Lists, tables, and long forms stay flat.

## Accessibility

- Text on a pastel fill is the dark ink token. White text on pastel fails.
- Pastel on a pale background is about 1.3:1, so the fill isn't a 3:1 boundary. The label, the shadow, and the shape carry the control.
- Increased contrast adds a 1px border in the darkened fill to every interactive element.
- A scale change isn't a focus indicator: focus is an ink ring outside the outer shadow.
- Under Reduce Motion the squish becomes a shade change with no scale.

## Platform Implementation

Signature technique: three shadows on a filled shape. Inner highlight, inner shade, colored outer shadow.

**iOS / SwiftUI**
```swift
struct ClayButtonStyle: ButtonStyle {
    var fill: Color = Color.Semantic.Accent.primary
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed

        configuration.label
            .foregroundStyle(Color.Semantic.Text.primary)
            .padding(Spacing.s5)
            .background {
                Capsule()
                    .fill(
                        fill
                            .shadow(.inner(color: .white.opacity(0.6), radius: 6, x: 3, y: 3))
                            .shadow(.inner(color: .black.opacity(0.15), radius: 8, x: -4, y: -4))
                    )
                    .shadow(color: fill.opacity(0.4), radius: pressed ? 6 : 12, y: pressed ? 4 : 12)
            }
            .scaleEffect(pressed && !reduceMotion ? 0.96 : 1)
            .animation(reduceMotion ? nil : Motion.Spring.expressive, value: pressed)
    }
}
```
The literal radii and offsets stand in for the shadow tokens above.

**Android / Compose**
```kotlin
val pressed by interaction.collectIsPressedAsState()
val scale by animateFloatAsState(if (pressed) 0.96f else 1f, Motion.Spring.expressive())

Box(
    Modifier
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .dropShadow(shape, Shadow(radius = 24.dp, color = fill, offset = DpOffset(0.dp, 12.dp), alpha = 0.4f))
        .background(fill, shape)
        .innerShadow(shape, Shadow(radius = 6.dp, color = Color.White, offset = DpOffset(3.dp, 3.dp), alpha = 0.6f))
        .innerShadow(shape, Shadow(radius = 8.dp, color = Color.Black, offset = DpOffset((-4).dp, (-4).dp), alpha = 0.15f))
        .clickable(interactionSource = interaction, indication = null, onClick = onClick)
)
```
Order matters: drop shadow before `background`, inner shadows after it. Dynamic color off, since the pastel palette is the style.

**Web**
```css
.clay {
  --clay-fill: var(--color-semantic-accent-primary);
  background: var(--clay-fill);
  color: var(--color-semantic-text-primary);
  border: 0;
  border-radius: var(--radius-pill);
  box-shadow:
    0 12px 24px color-mix(in oklch, var(--clay-fill) 40%, transparent),
    inset 3px 3px 6px rgb(255 255 255 / 0.6),
    inset -4px -4px 8px color-mix(in oklch, var(--clay-fill), black 15%);
}
.clay:active { scale: 0.96; }
@media (prefers-reduced-motion: no-preference) {
  .clay { transition: scale var(--spring-expressive-duration) var(--spring-expressive); }
}
@media (prefers-contrast: more) {
  .clay { border: 1px solid color-mix(in oklch, var(--clay-fill), black 40%); }
}
```
