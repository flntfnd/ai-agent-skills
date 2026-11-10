# Kinetic Typography

Type is the primary visual element and it moves. Text animates in response to scroll, time, interaction, or state. Not marquees, not carousels. The motion has a purpose: how text arrives, transforms, or exits.

**When to use**: Marketing surfaces, onboarding, empty states, loading moments, editorial features. Not data tables, forms, utility UI, or long body copy.

**Not to be confused with**: Editorial / Structural (type-led but static; reveals there are line-level only), Brutalism (Pure) (oversized static type). A type-led layout that doesn't move is one of those.

## Visual Signature

Identifiable at a glance by: oversized display type that animates on entry or scroll, with supporting content revealed progressively. Type is the layout; no cards or image heroes do the work.

**Structural requirements:**
- Hero: display text at 72-120px (scaled down with `clamp()` on small screens) that animates in by clipped vertical reveal or a weight/width axis transition. No static hero image as the primary element.
- Content reveals: scroll-linked character, word, or line stagger, decelerating into place.
- Layout: type-first, containers minimal or absent, whitespace generous so moving type has room.
- Resting state: every animation ends in a fully legible static composition that stands as a type-led layout by itself.

**Wrong if:** the layout relies on image or card structure with type secondary, text is static at every scroll position when motion is allowed, unrelated animation types compete on one screen, motion loops forever, or the resting state is hard to read.

## Token Modifications

```
typography/size/display → 72-120sp for hero text
typography/weight → variable (Roboto Flex, SF Pro, a variable web font)
  weight 100-900, width 75-125

motion: reveals are system-triggered, so they use an ease token, not a spring.
        Type that follows a gesture uses the standard spring token.
style-specific tokens, defined beside the motion-design set (motion/kinetic/*):
  reveal: expo-out curve at the cinematic duration
  char-stagger 30ms   word-stagger 60ms   line-stagger 120ms
  one staggered entrance stays under about 1.5s in total
```

## Component Rules

- One reveal pattern per context: character stagger for hero moments, line reveal for body content, weight animation for emphasis.
- Character stagger is for short strings. Past about 40 characters use word or line stagger.
- Reveals animate transform, opacity, and clip only. Axis animation re-lays-out text every frame: one headline, never a paragraph.
- Reserve the final layout before animating; arriving text must not shift its surroundings.
- Text stays real, selectable text. Never an image or canvas bitmap.

## Accessibility

- Reduce Motion shows the resting state at once, or one short fade. No stagger, movement, or axis animation; the page is still a complete type-led layout.
- Split text reads letter by letter in a screen reader. Keep the full string as the accessible name on the parent and hide the fragments.
- Content must never depend on being caught mid-flight, and nothing flashes or pulses rapidly.
- Scroll-linked motion never blocks or hijacks scrolling.

## Platform Implementation

Signature technique: split text plus stagger, and variable-axis animation. Without the motion there's no style.

**iOS / SwiftUI**
```swift
struct LineReveal: TextRenderer {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func draw(layout: Text.Layout, in ctx: inout GraphicsContext) {
        let count = Double(layout.count)
        for (index, line) in layout.enumerated() {
            let local = min(max(progress * count - Double(index), 0), 1)
            var copy = ctx
            copy.opacity = local
            copy.translateBy(x: 0, y: (1 - local) * line.typographicBounds.rect.height)
            copy.draw(line)
        }
    }
}

struct KineticHeadline: View {
    let text: String
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Text(text)
            .textRenderer(LineReveal(progress: shown || reduceMotion ? 1 : 0))
            .animation(.timingCurve(Motion.Curve.expoOut, duration: Motion.Duration.cinematic), value: shown)
            .onAppear { shown = true }
    }
}
```
`TextRenderer` keeps one accessible `Text`; iterate runs and glyphs inside each line for character stagger. For weight, animate `.fontWeight` between named weights (`Font.Weight` has no numeric initializer). Scroll-linked reveals use `scrollTransition` or `onScrollGeometryChange`.

**Android / Compose**
```kotlin
val weight by animateIntAsState(if (visible) 900 else 100, tween(Motion.Duration.cinematic, easing = Motion.Ease.expoOut))
val step = (weight / 25) * 25                       // quantize to limit font instances
val family = remember(step) {
    FontFamily(
        Font(
            R.font.robotoflex_variable,
            variationSettings = FontVariation.Settings(FontVariation.weight(step))
        )
    )
}
Text(text = headline, fontFamily = family, style = MaterialTheme.typography.displayLarge)
```
Variable axes are set on the `Font`, not on `TextStyle`. Stagger fragments with one `Animatable` each from a single `LaunchedEffect`, and set the full string as the parent's `contentDescription`.

**Web**
```css
.kinetic-line { overflow: clip; }
.kinetic-char { display: inline-block; }

@media (prefers-reduced-motion: no-preference) {
  .kinetic-char {
    animation: kinetic-reveal var(--duration-cinematic) var(--ease-expo-out) both;
    animation-delay: calc(var(--kinetic-char-stagger) * (sibling-index() - 1));
  }
  @supports (animation-timeline: view()) {
    .kinetic-scroll {
      animation: kinetic-reveal linear both;
      animation-timeline: view();
      animation-range: entry 0% cover 35%;
    }
  }
}
@keyframes kinetic-reveal { from { translate: 0 100%; opacity: 0; } }
```
```html
<h1 aria-label="Design that moves">
  <span class="kinetic-line" aria-hidden="true"><span class="kinetic-char">D</span>...</span>
</h1>
```
The default state is the finished composition; animation layers on top. Scroll-linked timelines are linear because scroll supplies the pacing. GSAP SplitText with ScrollTrigger is for pinning, scrubbed multi-element timelines, and line splits that survive reflow (see `motion-design`).
