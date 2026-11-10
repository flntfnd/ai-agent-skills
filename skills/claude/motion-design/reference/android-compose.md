# Android / Jetpack Compose Motion

The `AnimationSpec` system and Material 3 Expressive `MotionScheme`. On Android the scheme is the first source of motion values. The `Motion.*` tokens from [cross-platform-tokens.md](cross-platform-tokens.md#definitions-per-platform) are for custom motion the scheme doesn't cover. Theme setup, shape morphing, and typography are in the `android-platform` skill.

## Status

`MotionScheme` and `MaterialExpressiveTheme` need the `material3` version named in `android-platform/SKILL.md` (Version Snapshot). Library versions and opt-in requirements live there. The scheme values below are Material's published ones as of November 2026.

## Contents

- [Spring and Tween](#spring-and-tween)
- [M3 Expressive MotionScheme](#m3-expressive-motionscheme)
- [Animation APIs](#animation-apis)
- [Shared Element Transitions](#shared-element-transitions)
- [Fling / Decay](#fling--decay)
- [Performance](#performance)
- [Reduce Motion](#reduce-motion)

## Spring and Tween

```kotlin
// Spring is the default spec for Compose animations.
// Defaults: dampingRatio = 1f (no bounce), stiffness = Spring.StiffnessMedium (1500f).
spring<Float>(dampingRatio = 0.7f, stiffness = 247f)

// Named constants, for reading existing code
Spring.DampingRatioHighBouncy    // 0.2
Spring.DampingRatioMediumBouncy  // 0.5
Spring.DampingRatioLowBouncy     // 0.75
Spring.DampingRatioNoBouncy      // 1.0
Spring.StiffnessVeryLow          // 50f
Spring.StiffnessLow              // 200f
Spring.StiffnessMediumLow        // 400f
Spring.StiffnessMedium           // 1500f
Spring.StiffnessHigh             // 10_000f

// Duration-based: for automated, non-interactive animation
tween<Float>(durationMillis = Motion.Duration.standard, easing = Motion.Ease.standard)
```

A spring retargets with its current velocity when interrupted. A `tween` restarts from rest. Compose's `LinearOutSlowInEasing`, `FastOutLinearInEasing`, and `FastOutSlowInEasing` are the **enter**, **exit**, and **standard** curves. Use them through `Motion.Ease`.

## M3 Expressive MotionScheme

Material's motion physics system replaces the older easing and duration tokens with springs set once on the theme. In an M3 Expressive app, ignore the legacy tokens. A scheme supplies six specs: three speeds for each of two kinds of property.

- **Spatial** specs are for anything that moves on screen: position, size, rotation, corner radius. These overshoot.
- **Effects** specs are for color and opacity. No overshoot. A bouncing opacity reads as a flicker.
- **Speed**: default for most motion, fast for small elements, slow for large or full-screen ones.

Two preset schemes. **Expressive** is Material's opinionated scheme and its recommendation for most products. It overshoots to add bounce. **Standard** has minimal bounce and is meant for utilitarian products.

| Spec | Expressive (damping, stiffness) | Standard (damping, stiffness) |
| --- | --- | --- |
| fast spatial | 0.6, 800 | 0.9, 1400 |
| default spatial | 0.8, 380 | 0.9, 700 |
| slow spatial | 0.8, 200 | 0.9, 300 |
| fast / default / slow effects | 1.0 at 3800 / 1600 / 800 | the same |

```kotlin
// Set once at the theme root
MaterialExpressiveTheme(
    motionScheme = MotionScheme.expressive()   // or MotionScheme.standard()
) {
    App()
}

// Read at the call site
val motion = MaterialTheme.motionScheme

motion.defaultSpatialSpec<Dp>()     // position, size
motion.fastSpatialSpec<Float>()     // small elements
motion.slowSpatialSpec<IntOffset>() // large or full-screen moves
motion.defaultEffectsSpec<Color>()  // color
motion.fastEffectsSpec<Float>()     // alpha
```

Pick the scheme for the app at the theme. Calling `MotionScheme.expressive()` inline at a call site bypasses the theme and defeats the point. Material components already use the theme's scheme. Custom components use it too, so they move like what surrounds them. Use a `Motion.Spring.*()` token only for motion the design specifies and the scheme doesn't offer. `LocalMotionScheme` is gone from current `material3`. Read `MaterialTheme.motionScheme`.

## Animation APIs

```kotlin
// animate*AsState: one value following a target
val scale by animateFloatAsState(
    targetValue = if (isPressed) 0.95f else 1f,
    animationSpec = MaterialTheme.motionScheme.fastSpatialSpec(),
    label = "button_scale"
)
Box(Modifier.graphicsLayer { scaleX = scale; scaleY = scale })

// updateTransition: several properties driven by one state
val transition = updateTransition(targetState = isExpanded, label = "expansion")
val width by transition.animateDp(
    transitionSpec = { MaterialTheme.motionScheme.defaultSpatialSpec() },
    label = "width"
) { expanded -> if (expanded) 300.dp else 56.dp }
val alpha by transition.animateFloat(
    transitionSpec = { MaterialTheme.motionScheme.defaultEffectsSpec() },
    label = "alpha"
) { expanded -> if (expanded) 1f else 0f }

// Animatable: imperative control from a coroutine (gestures, sequencing)
val offset = remember { Animatable(0f) }
LaunchedEffect(target) {
    offset.animateTo(targetValue = target, animationSpec = Motion.Spring.standard())
}
```

Calling `animateTo` on a running `Animatable` cancels the old animation and continues from the current value and velocity, which is the interruption behavior a gesture needs. During a drag call `offset.snapTo(value)`. On release, `animateTo` with the gesture's velocity as `initialVelocity`.

For appearing and disappearing content use `AnimatedVisibility` and `AnimatedContent`. In lazy lists, `Modifier.animateItem()` animates insertion, removal, and reordering.

## Shared Element Transitions

```kotlin
SharedTransitionLayout {
    AnimatedContent(targetState = showDetail, label = "detail") { detail ->
        if (!detail) {
            Image(
                painter = painter,
                contentDescription = null,
                modifier = Modifier
                    .sharedElement(
                        rememberSharedContentState(key = "hero"),
                        animatedVisibilityScope = this@AnimatedContent
                    )
                    .size(thumbnailSize)
                    .clickable { showDetail = true }
            )
        } else {
            Image(
                painter = painter,
                contentDescription = null,
                modifier = Modifier
                    .sharedElement(
                        rememberSharedContentState(key = "hero"),
                        animatedVisibilityScope = this@AnimatedContent
                    )
                    .fillMaxWidth()
            )
        }
    }
}
```

Elements are matched by key. `sharedElement` has to be called inside both a `SharedTransitionLayout` and an `AnimatedContent` or `AnimatedVisibility` scope. Pass those scopes down explicitly when the elements live in separate composables. Use `sharedElement` when the content is visually the same in both places (an image), `sharedBounds` when the container persists but its content changes (a card expanding into a screen).

## Fling / Decay

For gesture release with natural deceleration. Decay has no target. It starts at the release velocity and slows to a stop.

```kotlin
val decay = rememberSplineBasedDecay<Float>()
val offset = remember { Animatable(0f) }

// In the drag-end callback, not in composition
scope.launch {
    offset.animateDecay(initialVelocity = velocity, animationSpec = decay)
}
```

## Performance

Read animated values as late as possible. A value read in composition recomposes every frame. The same value read inside a lambda modifier only re-runs layout or draw.

```kotlin
// Recomposes every frame
Box(Modifier.offset(x = offsetX.dp).alpha(alpha))

// Draw phase only
Box(Modifier.graphicsLayer {
    translationX = offsetX
    this.alpha = alpha
})
```

Prefer `graphicsLayer` for scale, translation, rotation, and alpha. Animating `size` or `padding` re-measures the subtree every frame. Keep that to small regions.

Font variation settings belong to the `Font`, not `TextStyle`, so animating a variable-font axis resolves a new `FontFamily` per value. Quantize the animated value (steps of 25 for weight) and `remember` the family per step. The full pattern is in `android-platform`.

## Reduce Motion

Android's accessibility setting is "Remove animations", which sets the system animator duration scale to 0. Compose's animation APIs read that scale: `animate*AsState`, `Animatable`, transitions, and `AnimatedVisibility` jump to their end state on the next frame. There's nothing to substitute. A replacement fade would be skipped too.

What still needs handling:

- **End states must be correct on their own.** Don't rely on an intermediate keyframe or an animation's duration to sequence logic.
- **Loops and self-driven motion.** Infinite transitions, manual `withFrameNanos` loops, shader time uniforms, and ambient effects don't run. Check the setting and show a still state.

```kotlin
// False when the system animator duration scale is 0
val animationsEnabled = remember { ValueAnimator.areAnimatorsEnabled() }

if (animationsEnabled) AmbientBackground() else StaticBackground()
```

That value is read once. To react while the screen is open, register a `ValueAnimator.DurationScaleChangeListener` (API 33+).
