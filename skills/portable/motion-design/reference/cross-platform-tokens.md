# Motion Tokens

This is the one definition of the motion token names and their values on every platform. The other files in this skill, and the `apple-platform`, `android-platform`, `web-platform`, and `visual-styles` skills, use these names and don't define their own. Change a value here and nowhere else.

Three families, matching the spring-vs-ease rule. **Spring tokens** for user-triggered motion. **Duration and easing tokens**, used together, for system-triggered motion. A project's design files or existing token set override the values. The names stay. A visual style can declare extra tokens in its own file under the same naming rule. A style-local token is a token, not an inline value.

## Contents

- [Spring Tokens](#spring-tokens)
- [Duration Tokens](#duration-tokens)
- [Easing Tokens](#easing-tokens)
- [Definitions per Platform](#definitions-per-platform)
- [Reduced Motion Policy](#reduced-motion-policy)
- [Anti-Patterns](#anti-patterns)

## Spring Tokens

One spring per token, written three ways. All three platforms run the same spring: mass 1, stiffness (2π / duration)², damping ratio 1 - bounce.

| Token | Use | Spring | Swift | Kotlin | CSS |
| --- | --- | --- | --- | --- | --- |
| **snappy** | Press states, toggles, controls | 0.25s, bounce 0.15 | `Motion.Spring.snappy` | `Motion.Spring.snappy()` | `var(--spring-snappy)` over `var(--spring-snappy-duration)` |
| **standard** | Default for interactive elements: cards, sheets, menus, navigation | 0.35s, bounce 0 | `Motion.Spring.standard` | `Motion.Spring.standard()` | `var(--spring-standard)` over `var(--spring-standard-duration)` |
| **expressive** | Visible bounce: FABs, notifications, moments meant to delight | 0.4s, bounce 0.3 | `Motion.Spring.expressive` | `Motion.Spring.expressive()` | `var(--spring-expressive)` over `var(--spring-expressive-duration)` |
| **dragRelease** | An element let go after a drag, settling with the gesture's velocity | 0.3s, bounce 0.28 | `Motion.Spring.dragRelease` | `Motion.Spring.dragRelease()` | none: CSS can't inherit gesture velocity, so drag release on web is driven from JavaScript |

A spring's duration is perceptual, not its settle time. The CSS `--spring-*-duration` values (350ms, 520ms, 660ms) are settle times, which is why they're longer. Each CSS curve is only valid at its paired duration.

Android apps themed with Material 3 Expressive take component and component-like motion from `MaterialTheme.motionScheme` instead. See `android-platform`. `Motion.Spring.*()` is for custom motion the scheme doesn't cover.

## Duration Tokens

For system-triggered motion, always paired with an easing token. Springs don't take a duration token.

| Token | Value | Use | Swift | Kotlin | CSS |
| --- | --- | --- | --- | --- | --- |
| **micro** | 83ms | Feedback that isn't spring-driven: icon swaps, color flips | `Motion.Duration.micro` | `Motion.Duration.micro` | `var(--duration-micro)` |
| **fast** | 150ms | Small state changes, exits, fades | `Motion.Duration.fast` | `Motion.Duration.fast` | `var(--duration-fast)` |
| **standard** | 250ms | Most transitions: dropdown open, toast appear, content swap | `Motion.Duration.standard` | `Motion.Duration.standard` | `var(--duration-standard)` |
| **slow** | 350ms | Large layout shifts, full-screen transitions | `Motion.Duration.slow` | `Motion.Duration.slow` | `var(--duration-slow)` |
| **cinematic** | 600ms | Deliberate editorial moments, ambient loops | `Motion.Duration.cinematic` | `Motion.Duration.cinematic` | `var(--duration-cinematic)` |

Nothing shorter than **micro**. Below that, make the change instant. Nothing longer than **700ms** in product UI. If an animation needs longer to feel right, more motion isn't the fix. Scroll-scrubbed and ambient WebGL sequences have no duration of their own, so they're exempt.

## Easing Tokens

| Token | Curve | Use | Swift | Kotlin | CSS |
| --- | --- | --- | --- | --- | --- |
| **enter** | 0, 0, 0.2, 1 | Entrances: decelerates as it arrives | `Motion.Curve.enter` | `Motion.Ease.enter` | `var(--ease-enter)` |
| **exit** | 0.4, 0, 1, 1 | Exits: accelerates as it leaves | `Motion.Curve.exit` | `Motion.Ease.exit` | `var(--ease-exit)` |
| **standard** | 0.4, 0, 0.2, 1 | State changes that stay on screen | `Motion.Curve.standard` | `Motion.Ease.standard` | `var(--ease-standard)` |
| **emphasized** | 0.2, 0, 0, 1 | Quick start, long settle: hero and container moves | `Motion.Curve.emphasized` | `Motion.Ease.emphasized` | `var(--ease-emphasized)` |
| **expo-out** | 0.16, 1, 0.3, 1 | Very fast start, very long tail: reveals | `Motion.Curve.expoOut` | `Motion.Ease.expoOut` | `var(--ease-expo-out)` |
| **sine-in-out** | 0.45, 0.05, 0.55, 0.95 | Gentle and symmetrical: slow, ambient | `Motion.Curve.sineInOut` | `Motion.Ease.sineInOut` | `var(--ease-sine-in-out)` |

Linear isn't a token. It's only right for continuous loops and scroll-linked motion.

Swift is the one exception to the naming rule. SwiftUI animations carry their duration, so `motion/ease/<name>` becomes two things: `Motion.Curve.<name>` is the bare curve, and `Motion.Ease.<name>` is the ready-to-use `Animation`, the curve at its default duration. The pairs are `Motion.Ease.enter` (enter, standard), `exit` (exit, fast), `standard` (standard, standard), `emphasized` (emphasized, slow), `expoOut` (expo-out, cinematic), `fade` (enter, fast), and `ambient` (sine-in-out, cinematic). In Kotlin `Motion.Ease.enter`, `exit`, and `standard` alias Compose's `LinearOutSlowInEasing`, `FastOutLinearInEasing`, and `FastOutSlowInEasing`. Call sites use the token name.

## Definitions per Platform

One definition site per platform. Call sites reference the token, never a raw curve, duration, or spring constant.

```css
:root {
    --duration-micro: 83ms;
    --duration-fast: 150ms;
    --duration-standard: 250ms;
    --duration-slow: 350ms;
    --duration-cinematic: 600ms;

    --ease-enter: cubic-bezier(0, 0, 0.2, 1);
    --ease-exit: cubic-bezier(0.4, 0, 1, 1);
    --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-sine-in-out: cubic-bezier(0.45, 0.05, 0.55, 0.95);

    /* Springs as linear() stops: mass 1, stiffness (2π / duration)²,
       damping ratio 1 - bounce, sampled to the point the spring settles
       within 0.1%. */

    /* snappy: duration 0.25s, bounce 0.15 (stiffness 632, damping ratio 0.85) */
    --spring-snappy: linear(0, 0.006 1.2%, 0.026 2.8%, 0.057 4.2%, 0.096 5.8%, 0.191 8.8%, 0.413 15%, 0.514 18%, 0.613 21.2%, 0.698 24.5%, 0.765 27.5%, 0.825 30.8%, 0.873 34%, 0.914 37.5%, 0.946 41.2%, 0.971 45.5%, 0.989 50.2%, 1 55.8%, 1.006 67.8%, 1);
    --spring-snappy-duration: 350ms;

    /* standard: duration 0.35s, bounce 0 (stiffness 322, damping ratio 1) */
    --spring-standard: linear(0, 0.004 1%, 0.019 2.2%, 0.043 3.5%, 0.08 5%, 0.156 7.5%, 0.367 13.8%, 0.463 16.8%, 0.557 20%, 0.638 23.2%, 0.707 26.5%, 0.769 30%, 0.819 33.5%, 0.862 37.2%, 0.901 41.8%, 0.93 46.5%, 0.954 52%, 0.972 58.2%, 0.984 65.2%, 0.992 73.5%, 1);
    --spring-standard-duration: 520ms;

    /* expressive: duration 0.4s, bounce 0.3 (stiffness 247, damping ratio 0.7), 4.6% overshoot */
    --spring-expressive: linear(0, 0.008 1.2%, 0.03 2.5%, 0.063 3.8%, 0.114 5.2%, 0.218 7.8%, 0.476 13.2%, 0.587 15.8%, 0.697 18.5%, 0.783 21%, 0.855 23.5%, 0.918 26.2%, 0.966 29%, 1.003 32%, 1.022 34.2%, 1.036 36.8%, 1.044 39.5%, 1.046 42.5%, 1.041 47.8%, 1.012 62.3%, 1.003 70%, 0.998 81.8%, 1);
    --spring-expressive-duration: 660ms;

    --motion-distance-sm: 12px;
    --motion-distance-md: 24px;
}
```

```swift
import SwiftUI

enum Motion {
    enum Duration {
        static let micro: TimeInterval = 0.083
        static let fast: TimeInterval = 0.15
        static let standard: TimeInterval = 0.25
        static let slow: TimeInterval = 0.35
        static let cinematic: TimeInterval = 0.6
    }

    enum Curve {
        static let enter = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0, y: 0), endControlPoint: UnitPoint(x: 0.2, y: 1))
        static let exit = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.4, y: 0), endControlPoint: UnitPoint(x: 1, y: 1))
        static let standard = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.4, y: 0), endControlPoint: UnitPoint(x: 0.2, y: 1))
        static let emphasized = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.2, y: 0), endControlPoint: UnitPoint(x: 0, y: 1))
        static let expoOut = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.16, y: 1), endControlPoint: UnitPoint(x: 0.3, y: 1))
        static let sineInOut = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.45, y: 0.05), endControlPoint: UnitPoint(x: 0.55, y: 0.95))
    }

    enum Spring {
        static let snappy = Animation.snappy(duration: 0.25)                 // bounce 0.15
        static let standard = Animation.spring(duration: 0.35, bounce: 0)
        static let expressive = Animation.spring(duration: 0.4, bounce: 0.3)
        static let dragRelease = Animation.spring(duration: 0.3, bounce: 0.28)
    }

    enum Ease {
        static let enter = Animation.timingCurve(Curve.enter, duration: Duration.standard)
        static let exit = Animation.timingCurve(Curve.exit, duration: Duration.fast)
        static let standard = Animation.timingCurve(Curve.standard, duration: Duration.standard)
        static let emphasized = Animation.timingCurve(Curve.emphasized, duration: Duration.slow)
        static let expoOut = Animation.timingCurve(Curve.expoOut, duration: Duration.cinematic)
        static let fade = Animation.timingCurve(Curve.enter, duration: Duration.fast)
        static let ambient = Animation.timingCurve(Curve.sineInOut, duration: Duration.cinematic)
    }
}
```

```kotlin
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.spring

object Motion {
    object Spring {
        fun <T> snappy(): SpringSpec<T> = spring(dampingRatio = 0.85f, stiffness = 632f)
        fun <T> standard(): SpringSpec<T> = spring(dampingRatio = 1f, stiffness = 322f)
        fun <T> expressive(): SpringSpec<T> = spring(dampingRatio = 0.7f, stiffness = 247f)
        fun <T> dragRelease(): SpringSpec<T> = spring(dampingRatio = 0.72f, stiffness = 439f)
    }

    object Duration {
        const val micro = 83
        const val fast = 150
        const val standard = 250
        const val slow = 350
        const val cinematic = 600
    }

    object Ease {
        val enter: Easing = LinearOutSlowInEasing
        val exit: Easing = FastOutLinearInEasing
        val standard: Easing = FastOutSlowInEasing
        val emphasized: Easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)
        val expoOut: Easing = CubicBezierEasing(0.16f, 1f, 0.3f, 1f)
        val sineInOut: Easing = CubicBezierEasing(0.45f, 0.05f, 0.55f, 0.95f)
    }
}
```

Usage:

```css
.button { transition: scale var(--spring-snappy-duration) var(--spring-snappy); }
.toast  { transition: opacity var(--duration-standard) var(--ease-enter); }
```
```swift
withAnimation(Motion.Spring.standard) { isExpanded.toggle() }
```
```kotlin
animateFloatAsState(target, animationSpec = Motion.Spring.snappy(), label = "scale")
tween<Float>(durationMillis = Motion.Duration.standard, easing = Motion.Ease.enter)
```

GSAP registers the easing tokens under the same names (`"enter"`, `"expo-out"`, and so on). See [gsap.md](gsap.md#setup).

## Reduced Motion Policy

The policy lives here. Each platform file only shows the API that reads the setting. The reasons are in [foundations.md](foundations.md#why-reduced-motion-matters).

When the user asks for reduced motion:

- **Spatial motion becomes a fade.** Replace slides, zooms, scale, and shared-element travel with an opacity change at **fast** with **enter** (`Motion.Ease.fade`), or an instant change.
- **Springs lose their bounce.** Where a spring stays (a control following a finger), use **standard**, never **expressive**.
- **Scroll-linked motion goes.** No parallax, no scroll-driven transforms, no pinned or scrubbed sequences. Content sits in its final position. Smooth scrolling is off.
- **Autoplaying and looping decoration stops.** A spinner that says "working" can stay.
- **Feedback stays.** Color, opacity, and state changes still happen. Reduced motion never means a control gives no response.

Android's "Remove animations" goes further. It zeroes the animator duration scale, so Compose animations jump to their end state and no substitute fade runs. See [android-compose.md](android-compose.md#reduce-motion).

## Anti-Patterns

**Linear motion on interactive elements.** Nothing physical moves at constant velocity. Use a spring or an ease.

**Identical timing for all properties.** Opacity that finishes slightly before position reads as one arrival. Opacity that finishes long before it shows the destination before the journey is over.

**Animating layout properties.** `width`, `height`, `top`, `left`, `margin`, `padding` trigger layout every frame. Animate render-time properties: `transform`/`translate`/`scale` and `opacity` on web, `scaleEffect`/`offset` in SwiftUI, `graphicsLayer` in Compose.

**Interrupting without velocity handoff.** When a user reverses direction mid-flight, the new animation has to pick up the current velocity. Springs do. Duration-based animations restart from rest.

**Staggering too much.** 30-60ms between items creates rhythm. 150ms makes the UI feel slow. Stagger the first several items and bring the rest in together.

**Decorative animation on high-frequency paths.** Press feedback is **snappy** or **micro**, nothing longer.

**Parallax on critical content.** It can't be what positions content a user needs to read.

**Inline motion values.** A raw `cubic-bezier()`, a bare millisecond count, or spring constants at a call site.

**Not testing interruption.** Tap, release, tap again rapidly. Swipe, reverse, swipe again. If it breaks, it's duration-based where it should be a spring, or it restarts from a hard-coded start value.

**Skipping reduced motion.** Test every animated surface with the system setting on.
