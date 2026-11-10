# Calm / Anti-Distraction

Deliberate restraint. Extreme whitespace, almost no color, nothing that asks for attention. Built for long sessions without fatigue. Decoration is a cost, not a default. The interface recedes until only the content is left.

**When to use**: Reading apps, writing tools, meditation, journaling, focus tools; also professional tools used for hours at a time.

**Not to be confused with**: Neo-Minimalism (still an expressive brand surface with serif display and visible personality; Calm suppresses personality in favor of content), Brutalism (Pure) (also sparse, but confrontational and high-contrast; Calm is soft and quiet).

## Visual Signature

Identifiable at a glance by: extreme whitespace (1.5-2x what any other style uses), one muted accent in one or two places, unhurried line height, and a near-total absence of chrome. No badges, counters, or notification-style elements.

**Structural requirements:**
- Spacing: 1.5-2x the base scale. The whitespace IS the design.
- Typography: body 18-20px, line height 1.7-1.9, one column at a 60-70 character measure. Regular for body, Medium for emphasis, nothing heavier.
- Color: three values -- a soft background, a near-black (or near-white) text color, and one muted accent for the primary interactive element. Secondary text is the text color at reduced strength, not a fourth hue.
- Navigation: a small title and one or two links, no background, no border. It may hide while reading and return on scroll-up or tap.
- Interactive elements: text or hairline-outline buttons. One filled button at most.
- Motion: none by default. Where a transition exists it's an opacity fade.
- Absent: badges, unread counts, notification dots, streaks, non-essential progress bars, unprompted tooltips, autoplay.

**Wrong if:** anything competes with the content for attention, there's more than one accent, spacing feels normal, navigation has visual weight, anything moves other than a slow fade, or a screen offers several equally weighted actions.

## Token Modifications

```
color/semantic/background/primary  → soft warm white, or very dark warm gray (never pure)
color/semantic/text/primary        → near-black or near-white (never pure)
color/semantic/text/secondary      → text toward background, still 4.5:1
color/semantic/interactive/primary → one muted accent
  light  bg #FAFAF8   text #2C2C2A   accent #44708E (5.1:1)   secondary #6E6E6A (4.9:1)
  dark   bg #1A1A18   text #E8E8E4   accent #A0B8C8 (8.5:1)   secondary #9A9A94 (6.2:1)

spacing: 1.5-2x base (sections 64-96px, content padding 24-32px)
radius: 8-16px, neither sharp nor pill
typography: Regular (400) body, Medium (500) emphasis
motion: the fade ease token on opacity only. No spring tokens, no movement, no scale,
        no scroll-linked animation.
```

## Component Rules

- One primary action per screen region.
- No badges on content. State that matters is plain text.
- Empty states are text only.
- No decorative dividers: use spacing.
- Feedback is a text change or brief fade. No sliding toasts, no celebration.
- The focus indicator is the strongest signal on screen. That's intended.

## Accessibility

- Muted means low saturation, not low contrast: accent text and secondary text both hold 4.5:1. A soft blue like #6B9FBF is 2.7:1 on the light background. It fails.
- Hidden navigation is never the only route. It stays in the landmark structure, is reachable by keyboard, and reappears on focus.
- Links in text are underlined, since color differences are deliberately small.
- Reduce Motion removes even the fades.
- The dark palette is designed, not derived: long-session reading is where it matters most.

## Platform Implementation

Signature technique: none, deliberately. Opacity fades are the entire motion vocabulary; any effect is a failure of the style.

**iOS / SwiftUI**
```swift
struct Reader: View {
    let article: String
    @State private var chromeHidden = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ScrollView {
            Text(article)
                .lineSpacing(Typography.Leading.reading)
                .frame(maxWidth: Size.measure)
                .padding(.horizontal, Spacing.s8)
        }
        .background(Color.Semantic.Background.primary)
        .toolbarVisibility(chromeHidden ? .hidden : .automatic, for: .navigationBar)
        .animation(reduceMotion ? nil : Motion.Ease.fade, value: chromeHidden)
    }
}
```
Hide bars with `toolbarVisibility`. The back swipe has to keep working. With a tab bar, use `.tabBarMinimizeBehavior(.onScrollDown)` instead of hiding it. Follow the system color scheme.

**Android / Compose**
```kotlin
AnimatedVisibility(
    visible = chromeVisible,
    enter = fadeIn(tween(Motion.Duration.fast)),
    exit = fadeOut(tween(Motion.Duration.fast))
) { TopBar() }

Text(text = article, style = MaterialTheme.typography.bodyLarge.copy(lineHeight = 1.7.em))
```
Fades only: no `spring()`, no slide or scale specs. Dynamic color off so the palette stays at three values. An immersive reader hides system bars with `WindowInsetsControllerCompat` and restores them on exit.

**Web**
```css
body { font-size: 1.125rem; line-height: 1.8; }
.content { max-width: 65ch; margin-inline: auto; }
section + section { margin-top: var(--spacing-11); }
.btn-calm { background: none; border: 1px solid currentColor; color: var(--color-semantic-interactive-primary); }
@media (prefers-reduced-motion: no-preference) {
  .fade { transition: opacity var(--duration-fast) var(--ease-enter); }
}
```
