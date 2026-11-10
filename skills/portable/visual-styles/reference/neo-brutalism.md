# Neo-Brutalism

Bold, flat, direct. Hard offset shadows, thick black borders, saturated fills, oversized type, sharp corners. Honest-materials brutalism, but polished and colorful.

**When to use**: Creator and community products, startups, creative and developer tools, non-enterprise fintech. For trust-led categories, confine it to a contained surface (marketing, onboarding, empty states).

**Not to be confused with**: Brutalism (Pure), which has no shadows, no fills, and no color. A hard offset shadow plus a saturated fill is Neo-Brutalism.

## Visual Signature

Identifiable at a glance by: hard flat offset shadows on cards and controls (offset 4/4, blur 0, solid black), thick black borders on every container, brand-color fills on large sections, ExtraBold or Black display type. The press-collapse -- shadow shrinks to zero while the element shifts into the space it occupied -- is the defining behavior. Implement it.

**Structural requirements:**
- Navigation: solid brand-color bar, full width, 2-4px black bottom border.
- Hero: full-width brand-color section, ExtraBold display type, radius 0.
- Content lists: each item is a CARD with a 2px black border and a hard shadow (X 4, Y 4, blur 0, spread 0, black at 100%), radius 0. Rows separated by hairlines are Neo-Minimalist.
- Interactive elements: press-collapse. Shadow offset 4/4 to 0/0, element translated 4/4.
- Sections alternate white and brand color; the CTA section is all brand color.
- Section dividers: 2px solid black.

**Wrong if:** items are divider-separated rows instead of boxed cards, any shadow has blur above 0, the shadow is grey or translucent, hover and press are subtle tints, or any corner has a radius above 4px.

## Token Modifications

```
color/primitive/brand → bold, saturated (placeholder #F59E0B; electric blue, coral, lime also fit)
color/semantic/background/primary  → #FFFFFF
color/semantic/background/secondary → brand (heavy use)
color/semantic/interactive/primary → brand
color/semantic/text/primary        → #000000
color/semantic/text/on-brand       → black or white, whichever passes 4.5:1 on the brand fill
                                     (white on the placeholder amber is 2.2:1; black is 9.8:1)
color/semantic/border/default      → #000000 at 100%

radius: 0 everywhere; 4 on explicitly softened elements only
border/width: default 2px, heavy 4px
shadow/hard-sm 2px 2px 0 0   md 4px 4px 0 0   lg 6px 6px 0 0   xl 8px 8px 0 0   (border/default color)

typography/weight/headline → ExtraBold (800) or Black (900)
typography/weight/body     → Medium (500)
typography/size/display    → 64-96sp
typography/family          → grotesque or display sans (Space Grotesk, Syne, Cabinet Grotesk)

motion: press uses the snappy spring token. Nothing slower on a press.
```

## Component Rules

- The translate distance always equals the shadow offset. A 3px move against a 4px shadow leaves a seam.
- Shadows fall down-right on every element: one light direction for the product.
- Linked cards lift on hover (shadow to `hard-lg`, element -2/-2) and collapse on press. Static cards do neither.
- Every state is a structural change (offset, fill swap, border weight), never a tint.
- No gradients, no blur, no translucency.
- Dark mode keeps solid offset blocks: near-black page, off-white borders and shadows. Never a white glow.

## Accessibility

- Text on a brand fill must pass 4.5:1 against that fill. Yellow, amber, and lime take black text.
- Disabled is a pattern or lighter border weight, not low-contrast grey text.
- Focus is a 3px outline offset far enough to clear border and shadow; on black backgrounds it takes the brand color.
- Under Reduce Motion drop the hover lift and spring overshoot; the 4px collapse may stay.

## Platform Implementation

Signature technique: none on the GPU, deliberately. The physical press-collapse is the signature.

**iOS / SwiftUI**
```swift
struct NeoBrutalButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let shift = configuration.isPressed ? HardShadow.offset : 0

        configuration.label
            .padding(Spacing.s5)
            .background(Color.Semantic.Interactive.primary)
            .border(Color.Semantic.Border.default, width: BorderWidth.default)
            .background(
                Rectangle()
                    .fill(Color.Semantic.Border.default)
                    .offset(x: HardShadow.offset - shift, y: HardShadow.offset - shift)
            )
            .offset(x: shift, y: shift)
            .animation(reduceMotion ? nil : Motion.Spring.snappy, value: configuration.isPressed)
    }
}
```
Drive the collapse from `configuration.isPressed`, not a tap gesture, so it tracks the finger and cancels correctly.

**Android / Compose**
```kotlin
val interaction = remember { MutableInteractionSource() }
val pressed by interaction.collectIsPressedAsState()
val shift by animateDpAsState(if (pressed) hardOffset else 0.dp, Motion.Spring.snappy())

Box(
    Modifier
        .offset(x = shift, y = shift)
        .dropShadow(
            shape = RectangleShape,
            shadow = Shadow(
                radius = 0.dp,
                color = MaterialTheme.colorScheme.outline,
                offset = DpOffset(hardOffset - shift, hardOffset - shift)
            )
        )
        .background(MaterialTheme.colorScheme.primary)
        .border(borderWidth, MaterialTheme.colorScheme.outline, RectangleShape)
        .clickable(interactionSource = interaction, indication = null, onClick = onClick)
)
```
`dropShadow` with a zero radius is the hard shadow; elevation-based `shadow()` can't produce it. The collapse replaces the ripple.

**Web**
```css
.nb-button {
  border: var(--border-width-default) solid var(--color-semantic-border-default);
  box-shadow: var(--shadow-hard-md);
  border-radius: 0;
  transition: box-shadow var(--spring-snappy-duration) var(--spring-snappy),
              translate var(--spring-snappy-duration) var(--spring-snappy);
}
.nb-button:hover  { box-shadow: var(--shadow-hard-lg); translate: -2px -2px; }
.nb-button:active { box-shadow: 0 0 0 0 var(--color-semantic-border-default); translate: 4px 4px; }
@media (prefers-reduced-motion: reduce) {
  .nb-button { transition: none; }
  .nb-button:hover { translate: none; }
}
```
