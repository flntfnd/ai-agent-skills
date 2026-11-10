# Glassmorphism / Frosted

Translucent surfaces with background blur, a light highlight stroke, and soft depth. Static blur plus opacity: no lensing, no refraction. Use it selectively: a few floating surfaces with enough frost to keep text legible. Not glass on everything.

**When to use**: Web dashboards, marketing sites, Android apps, and content-level cards on Apple platforms where a translucent look is called for.

**Not to be confused with**: Liquid Glass (`liquid-glass.md`), Apple's system material for the navigation layer. On Apple platforms bars and toolbars take Liquid Glass; this style is for content-level glass, and for any glass on Web or Android. Neumorphism is opaque and needs a plain background; this needs a rich one.

## Visual Signature

Identifiable at a glance by: panels that show blurred content through them, a thin light stroke brightest on the top edge, and a rich background (gradient, imagery, deep color) visible through every glass surface.

**Structural requirements:**
- Background: a vivid gradient, image, or deep color field behind ALL glass. Glass over a flat surface is just a flat tint. Not optional.
- Panels: translucent fill, background blur, 1px inside light stroke, soft drop shadow, sitting directly on the rich layer.
- Navigation: a glass bar floating over the hero, same recipe.
- Depth: nearer surfaces are more opaque and more blurred.
- Restraint: at most two stacked glass layers and a handful of glass surfaces per viewport.

**Wrong if:** there's nothing rich behind the glass, a glass fill is fully opaque, the blur is missing (a tint alone isn't glass), strokes are hard dark lines, or every surface on the page is glass.

## Token Modifications

The recipe is defined here and nowhere else.

```
color/semantic/background/elevated → white at 12% (light), white at 8% (dark)      glass fill
  strong variant                   → white at 20% (light), white at 15% (dark)
  solid variant                    → an opaque surface, for the fallbacks below
color/semantic/border/default      → white at 25%
effect/blur/md 16px (standard)   effect/blur/lg 32px (heavy)
effect/saturate/md 1.4
glass/shadow:    0 8px 32px black at 12%
glass/highlight: inset 0 1px 0 white at 30%
glass/scrim:     black at 15-35%, inside the glass, behind text
```

## Component Rules

- Floating elements only: nav bars, cards over imagery, modals, popovers. Never the page background, never tables or long text.
- **Scrim**: over unpredictable backgrounds (user imagery, video), put a semi-opaque gradient inside the glass behind the text.
- **Color shift**: blur averages and shifts what is behind it. Review over the real range of content, not one placeholder image.
- Keep glass regions small and never animate the blur radius: backdrop blur is expensive.

## Accessibility

- Contrast is measured against the worst-case backdrop. If text can't hold 4.5:1 over the lightest and darkest content that can pass beneath, raise the fill opacity or add the scrim.
- Reduce Transparency and Increase Contrast swap the fill for the solid variant and drop the blur.
- A 25% white stroke isn't a control boundary. Inputs and buttons on glass need their own 3:1 edge or fill.
- Focus rings are two-tone (light inner, dark outer) so they survive any backdrop.
- An animated background stops under Reduce Motion.

## Platform Implementation

Signature technique: the background, not the glass. A static or slowly drifting gradient field is the default; a canvas scene behind the DOM is for heroes only (see `motion-design`).

**iOS / SwiftUI**
```swift
struct GlassCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Radius.lg)
        content
            .padding(Spacing.s7)
            .background(.ultraThinMaterial, in: shape)
            .overlay(shape.strokeBorder(Color.Semantic.Border.default, lineWidth: 1))
    }
}
```
System materials adapt to dark mode, Reduce Transparency, and Increase Contrast on their own; don't hand-roll blur. `MeshGradient` supplies the rich background.

**Android / Compose**
```kotlin
// Modal glass: blur the background layer, then draw the panel over it.
Box {
    Background(Modifier.blur(if (overlayVisible) glassBlur else 0.dp))
    if (overlayVisible) {
        Panel(
            Modifier
                .background(MaterialTheme.colorScheme.surfaceContainerHigh.copy(alpha = glassFillAlpha), shape)
                .border(Dp.Hairline, MaterialTheme.colorScheme.outline, shape)
        )
    }
}
```
Compose has no backdrop-blur modifier: `Modifier.blur()` and `BlurEffect` blur the layer they're applied to, so blurring the panel blurs its own content. Glass over live scrolling content means capturing the backdrop into a `GraphicsLayer` and redrawing it blurred (the Haze library does this; it's a third-party dependency, so ask before adding it). Blur needs API 31; below that use the solid variant.

**Web**
```css
.glass {
  background: var(--color-semantic-background-elevated);
  backdrop-filter: blur(var(--effect-blur-md)) saturate(var(--effect-saturate-md));
  border: 1px solid var(--color-semantic-border-default);
  box-shadow: var(--glass-shadow), var(--glass-highlight);
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass { background: var(--color-semantic-background-elevated-solid); backdrop-filter: none; }
}
```
