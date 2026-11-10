# Neumorphism / Soft UI

Soft extruded surfaces. Elements rise out of or press into the background through a paired shadow: light toward the light source (upper-left), dark opposite, on an element whose fill matches the background. Tactile and dimensional without borders.

**When to use**: Wellness, audio and music controls, smart-home and device-style panels; small focused UIs where a physical feel serves the content. It doesn't scale to dense layouts. I only ship the accessible form described here.

**Not to be confused with**: Claymorphism (inflated elements with their own pastel fills that stand off the background; here every element matches it), Glassmorphism (translucent, needs a rich background), Texture / Tactile (material grain on flat geometry).

## Visual Signature

Identifiable at a glance by: one base color on every surface -- page, cards, buttons -- with no borders and no hierarchy through color. Depth comes only from the paired shadow. Buttons look raised; pressed and selected states look pushed in.

**Structural requirements:**
- One mid-light or mid-dark base color everywhere. Never pure white or pure black: one of the two shadows would have nowhere to go.
- Raised: two drop shadows. Light X -4, Y -4, blur 8. Dark X 4, Y 4, blur 8. No stroke, fill equals base.
- Pressed and selected: two inner shadows. Dark X 2, Y 2, blur 6. Light X -2, Y -2, blur 6.
- One light direction across the product.

**Wrong if:** surfaces use different fills, an element has a visible stroke at default contrast settings, a shadow is single rather than paired, the two shadows disagree about the light, or text and icons are tone-on-tone.

## Token Modifications

```
color/semantic/background/primary = background/secondary = background/elevated → one base
  light #E4EBF5 (or a warm equivalent)     dark #1E1E2E
color/semantic/text/primary, text/secondary → 4.5:1 on the base
  (on the light base #2A2622 is 12.5:1 and #4A5568 is 6.3:1; mid greys near #6B7280 fail)
color/semantic/interactive/primary → one saturated accent, for selected state and focus
color/semantic/border/default      → none; text/secondary at 1px under increased contrast

shadow tones derive from the base, not from fixed white and black:
  tone-light: base toward white (70% on the light theme, about 8% on the dark theme)
  tone-dark:  base toward black (20% on the light theme, 50% on the dark theme)
shadow/raised: -4px -4px 8px tone-light,  4px 4px 8px tone-dark
shadow/inset:  inset 2px 2px 6px tone-dark,  inset -2px -2px 6px tone-light

radius: 16-24px on interactive elements
```

## Component Rules

- Buttons are raised at rest, inset while pressed.
- Toggles, segmented controls, and tabs show the selected option inset AND marked with the accent. Shadow direction alone isn't a state.
- Sliders: inset track, raised thumb, accent on the filled portion.
- Keep it sparse. Each raised element needs base-colored space around it for its shadows to read.

## Accessibility

This style fails accessibility by default. These fixes are part of the style, not extras.

- Text and icons use the text tokens at full contrast. Same-hue icons that melt into the surface are the classic failure.
- Soft shadows rarely give a control a 3:1 boundary, so every control carries a label or icon that identifies it without its edge.
- Increased contrast adds a 1px `text/secondary` border to every interactive element. This is the one sanctioned stroke.
- A shadow change isn't a focus indicator: focus is an accent ring.
- Disabled flattens the element (no shadow) and keeps its label at 3:1 or better.

## Platform Implementation

Signature technique: none beyond shadows. The work is the paired-shadow system, tones derived from the base, and base-color discipline.

**iOS / SwiftUI**
```swift
struct NeumorphicButtonStyle: ButtonStyle {
    @Environment(\.colorSchemeContrast) private var contrast

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: Radius.lg)
        let base = Color.Semantic.Background.primary

        configuration.label
            .padding(Spacing.s5)
            .background {
                if configuration.isPressed {
                    shape.fill(
                        base
                            .shadow(.inner(color: ShadowTone.dark, radius: 6, x: 2, y: 2))
                            .shadow(.inner(color: ShadowTone.light, radius: 6, x: -2, y: -2))
                    )
                } else {
                    shape.fill(base)
                        .shadow(color: ShadowTone.light, radius: 8, x: -4, y: -4)
                        .shadow(color: ShadowTone.dark, radius: 8, x: 4, y: 4)
                }
            }
            .overlay {
                if contrast == .increased {
                    shape.strokeBorder(Color.Semantic.Text.secondary, lineWidth: 1)
                }
            }
    }
}
```
The literal radii and offsets stand in for the shadow tokens above.

**Android / Compose**
```kotlin
val pressed by interaction.collectIsPressedAsState()
val base = MaterialTheme.colorScheme.surface

Box(
    Modifier
        .then(
            if (pressed) Modifier else Modifier
                .dropShadow(shape, Shadow(radius = 8.dp, color = toneLight, offset = DpOffset((-4).dp, (-4).dp)))
                .dropShadow(shape, Shadow(radius = 8.dp, color = toneDark, offset = DpOffset(4.dp, 4.dp)))
        )
        .background(base, shape)
        .then(
            if (!pressed) Modifier else Modifier
                .innerShadow(shape, Shadow(radius = 6.dp, color = toneDark, offset = DpOffset(2.dp, 2.dp)))
                .innerShadow(shape, Shadow(radius = 6.dp, color = toneLight, offset = DpOffset((-2).dp, (-2).dp)))
        )
)
```
Order matters: drop shadows before `background`, inner shadows after it. Elevation-based `shadow()` casts one shadow and can't do this.

**Web**
```css
:root {
  --tone-light: color-mix(in oklch, var(--color-semantic-background-primary), white 70%);
  --tone-dark:  color-mix(in oklch, var(--color-semantic-background-primary), black 20%);
  --shadow-raised: -4px -4px 8px var(--tone-light), 4px 4px 8px var(--tone-dark);
  --shadow-inset:  inset 2px 2px 6px var(--tone-dark), inset -2px -2px 6px var(--tone-light);
}
.neu { background: var(--color-semantic-background-primary); border: 0; box-shadow: var(--shadow-raised); }
.neu:active, .neu[aria-pressed="true"] { box-shadow: var(--shadow-inset); }
.neu[aria-pressed="true"] { color: var(--color-semantic-interactive-primary); }
@media (prefers-contrast: more) { .neu { border: 1px solid var(--color-semantic-text-secondary); } }
```
