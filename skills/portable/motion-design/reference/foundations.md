# Motion Foundations

Spring vocabulary, the animation principles that apply to UI, and why reduced motion matters. True on every platform. Token names and values are in [cross-platform-tokens.md](cross-platform-tokens.md). The spring-vs-ease decision is in [SKILL.md](../SKILL.md).

## Contents

- [The Physics Properties](#the-physics-properties)
- [Animation Principles Applied to UI](#animation-principles-applied-to-ui)
- [Why Reduced Motion Matters](#why-reduced-motion-matters)

## The Physics Properties

Two values define every spring.

**Stiffness (or response, or duration)**: how quickly the element moves toward its target. Higher stiffness is faster and snappier.

**Damping ratio**: how much oscillation is suppressed. At 1.0 (critically damped) the element reaches its target with no overshoot. 0.6 to 0.85 is the usual range for UI. Below 0.5 is visible, intentional bounce. Above 1.0 (overdamped, or a negative `bounce` in SwiftUI) gives a flatter, heavier deceleration.

| Platform | Speed | Bounciness |
| --- | --- | --- |
| SwiftUI | `duration` (or the older `response`) | `bounce`; damping ratio = 1 - bounce |
| Compose | `stiffness` | `dampingRatio` |
| CSS | baked into a sampled `linear()` curve plus its duration | baked into the same curve |

The conversion is exact: stiffness = (2π / duration)² at mass 1. That's how the spring tokens stay identical across platforms.

SwiftUI's `duration` is perceptual: how fast the motion feels, not when the spring settles. A bouncy spring is still moving after it. Don't sequence work off that number. Use a completion callback.

## Animation Principles Applied to UI

Eight of the twelve principles from Thomas and Johnston's *The Illusion of Life* (1981) map straight onto interface motion.

**Squash and stretch**: a button press compresses slightly and releases slightly larger. A 1-3% scale change is enough to convey tactility.

**Anticipation**: a brief counter-movement or hesitation before the main action, such as a menu that dips before it dismisses.

**Follow-through and overlapping action**: trailing properties continue after the element settles. Text inside a card arrives slightly after the card.

**Staging**: the most important element animates first, supporting elements follow. Don't animate everything at once. The eye follows one thing.

**Slow in and slow out**: every UI transition accelerates into motion and decelerates out of it. The exceptions are continuous loops and scroll-linked motion, where scroll position is the clock.

**Secondary action**: the primary action (a card expanding) drives a secondary response (a shadow growing, icons fading in) that reinforces without competing.

**Timing**: the same curve at 100ms feels snappy and at 400ms feels deliberate. Timing sets perceived weight.

**Stagger**: elements that belong together move in sequence. 30-60ms between list items communicates grouping and rhythm.

## Why Reduced Motion Matters

About 35% of US adults aged 40 and over show vestibular dysfunction on balance testing (NHANES 2001-2004). For them, parallax, rapid scaling, spinning, and large translations can cause nausea, vertigo, and disorientation. Flashing and fast motion also affect people with photosensitive epilepsy, migraine, and attention disorders.

The answer isn't to remove all animation. It's to carry the same information without large-scale spatial motion. The policy is in [cross-platform-tokens.md](cross-platform-tokens.md#reduced-motion-policy). The API for reading the setting is in each platform file.

The WCAG 2.2 criteria behind it:

- **2.3.3 Animation from Interactions (AAA).** Motion triggered by interaction can be disabled unless it's essential.
- **2.2.2 Pause, Stop, Hide (A).** Auto-playing motion longer than five seconds alongside other content needs a pause control.
- **2.3.1 (A).** Nothing flashes more than three times per second.
