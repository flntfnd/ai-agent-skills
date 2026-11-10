# Typography, Shape & Motion

Material's own values. Which APIs need `material3` 1.5.0 is in the Version Snapshot in SKILL.md. Motion token names, Compose animation technique, variable-axis animation, and reduce-motion handling belong to the `motion-design` skill (`reference/cross-platform-tokens.md`, `reference/android-compose.md`).

## Contents
- [Type Scale](#type-scale)
- [Typography Setup](#typography-setup)
- [Fonts](#fonts)
- [Shape Scale](#shape-scale)
- [Shape Morphing](#shape-morphing)
- [Motion Scheme](#motion-scheme)

## Type Scale

One scale, 30 styles: 15 baseline and 15 emphasized. Emphasized styles keep size and line height and raise the weight. Components don't use them by default. Swap one in for selected items, unread messages, primary-action buttons, badges, and editorial headlines. No product uses all 30. Pick the subset the design needs.

| Style | Size / line height (sp) | Weight | Tracking (sp) | Emphasized weight |
| --- | --- | --- | --- | --- |
| displayLarge | 57 / 64 | 400 | -0.25 | 500 |
| displayMedium | 45 / 52 | 400 | 0 | 500 |
| displaySmall | 36 / 44 | 400 | 0 | 500 |
| headlineLarge | 32 / 40 | 400 | 0 | 500 |
| headlineMedium | 28 / 36 | 400 | 0 | 500 |
| headlineSmall | 24 / 32 | 400 | 0 | 500 |
| titleLarge | 22 / 28 | 400 | 0 | 500 |
| titleMedium | 16 / 24 | 500 | 0.15 | 700 |
| titleSmall | 14 / 20 | 500 | 0.1 | 700 |
| bodyLarge | 16 / 24 | 400 | 0.5 | 500 |
| bodyMedium | 14 / 20 | 400 | 0.25 | 500 |
| bodySmall | 12 / 16 | 400 | 0.4 | 500 |
| labelLarge | 14 / 20 | 500 | 0.1 | 700 |
| labelMedium | 12 / 16 | 500 | 0.5 | 700 |
| labelSmall | 11 / 16 | 500 | 0.5 | 700 |

Design files use this table. Code uses `Typography()` as it ships. The library rounds three trackings (displayLarge -0.2, titleMedium 0.2, bodyMedium 0.2), so code can sit a few hundredths of an sp off the table. Don't override to compensate.

When customizing, change typeface, line height, and tracking. Don't change sizes. Components are laid out around them.

## Typography Setup

```kotlin
// material3 1.5.0: one family across all 30 styles
val AppTypography = Typography(fontFamily = RobotoFlex)

// 1.4.0, or per-style changes: start from the defaults
private val Default = Typography()
val AppTypographyCustom = Default.copy(
    displayLarge = Default.displayLarge.copy(fontFamily = RobotoFlex),
    titleLarge = Default.titleLarge.copy(fontFamily = RobotoFlex)
    // remaining styles
)
```

Sizes and line heights are `sp`. Composables take styles from `MaterialTheme.typography` (`titleLargeEmphasized` for the emphasized twin). Android scales fonts non-linearly up to 200%, so no fixed-height text containers. Scripts taller than Latin need more line height (most non-Latin scripts about 7%, Burmese and Telugu about 30%). Containers sized by padding adapt. Fixed heights don't.

## Fonts

Roboto is the Material default and what `Typography()` uses. Roboto Flex isn't part of the M3 type scale, so using it means bundling it. I use it for its variable axes. It covers only Latin, Greek, and Cyrillic (about 900 glyphs), so it has to fall back to the system font for other scripts.

```kotlin
object TypeAxis {
    const val WeightRest = 400
    const val WidthDefault = 100f
}

fun robotoFlex(weight: Int, width: Float = TypeAxis.WidthDefault): FontFamily = FontFamily(
    Font(
        resId = R.font.roboto_flex,
        weight = FontWeight(weight),
        variationSettings = FontVariation.Settings(
            FontWeight(weight),
            FontStyle.Normal,
            FontVariation.width(width)
        )
    )
)

val RobotoFlex = robotoFlex(TypeAxis.WeightRest)
```

Axis values are tokens, not numbers in composables. Animating an axis on interaction is in motion-design's `android-compose.md`.

## Shape Scale

A ten-step scale named for roundedness. Components map to a step, so changing a step restyles every component on it.

| Step | Radius | `MaterialTheme.shapes` | Typical components |
| --- | --- | --- | --- |
| None | 0dp | `RectangleShape` | Full-width bars |
| Extra small | 4dp | `extraSmall` | Text field tops, menus, snackbars |
| Small | 8dp | `small` | Chips |
| Medium | 12dp | `medium` | Cards |
| Large | 16dp | `large` | FAB |
| Large increased | 20dp | `largeIncreased` | M3E |
| Extra large | 28dp | `extraLarge` | Dialogs, bottom sheet top, large FAB |
| Extra large increased | 32dp | `extraLargeIncreased` | M3E |
| Extra extra large | 48dp | `extraExtraLarge` | M3E |
| Full | fully rounded | `CircleShape` | Buttons, badges |

`Shapes()` already carries these. Declare `AppShapes` only for the steps the design changes. Closely grouped items (menus, split buttons, connected button groups) use asymmetric shapes with smaller inner corners from the same scale.

The Material Shape Library adds 35 named polygons (`MaterialShapes.Cookie9Sided`, `MaterialShapes.Clover4Leaf`, ...) in Figma and Compose. They all morph into each other. Use them for avatars, image masks, and hero containers.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
Modifier.clip(MaterialShapes.Cookie9Sided.toShape())
```

## Shape Morphing

Shape morphing is a state signal (pressed, selected, loading). It isn't decoration. Material uses it in the standard button group and the loading indicator. It runs on the expressive motion scheme by default.

**Stock components already morph.** M3E buttons take a shape pair and animate between them on press.

```kotlin
Button(onClick = onSave, shapes = ButtonDefaults.shapes()) { Text("Save") }

Button(
    onClick = onSave,
    shapes = ButtonDefaults.shapes(shape = CircleShape, pressedShape = MaterialTheme.shapes.small)
) { Text("Save") }
```

`IconButton` and `FilledIconButton` take `IconButtonDefaults.shapes()`. `ToggleButton` takes `ToggleButtonShapes`, which adds a checked shape.

**Custom morphs** use `Morph` from `androidx.graphics:graphics-shapes`. Build the polygons at the drawn size inside `drawWithCache` and drive progress from a spatial spec.

```kotlin
@Composable
fun MorphingBadge(selected: Boolean, modifier: Modifier = Modifier) {
    val progress by animateFloatAsState(
        targetValue = if (selected) 1f else 0f,
        animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
        label = "badgeMorph"
    )
    val color = MaterialTheme.colorScheme.primaryContainer

    Box(
        modifier.drawWithCache {
            val radius = size.minDimension / 2f
            val cx = size.width / 2f
            val cy = size.height / 2f
            val morph = Morph(
                start = RoundedPolygon.circle(numVertices = 8, radius = radius, centerX = cx, centerY = cy),
                end = RoundedPolygon.star(
                    numVerticesPerRadius = 8,
                    radius = radius,
                    innerRadius = radius * 0.8f,          // illustrative; take from the design
                    rounding = CornerRounding(radius * 0.2f),
                    centerX = cx,
                    centerY = cy
                )
            )
            onDrawBehind {
                drawPath(morph.toPath(progress = progress).asComposePath(), color)
            }
        }
    )
}
```

## Motion Scheme

M3E replaced easing-and-duration motion with springs. The old easing, duration, and path tokens are legacy. Ignore them.

A `MotionScheme` is set once in the theme and hands out six specs: two types at three speeds.

- **Spatial** specs animate anything that moves: position, size, rotation, corner radius. They overshoot and settle.
- **Effects** specs animate color and opacity. They never overshoot.
- **Speed**: `default` for most motion and for elements that partly cover the screen (bottom sheet, expanding rail). `fast` for small components (buttons, switches). `slow` for full-screen transitions.

Two schemes. **Expressive** overshoots to add bounce, and it's Material's recommendation for most products. **Standard** eases in with minimal bounce, for utilitarian products. A product runs on one scheme. Switch to the other only for a specific moment the design calls out. Material's own components run on two specs: fast spatial and fast effects.

```kotlin
val motion = MaterialTheme.motionScheme

val offset by animateDpAsState(
    targetValue = if (expanded) Spacing.s7 else Spacing.none,
    animationSpec = motion.defaultSpatialSpec(),
    label = "panelOffset"
)
val alpha by animateFloatAsState(
    targetValue = if (expanded) 1f else 0f,
    animationSpec = motion.defaultEffectsSpec(),
    label = "panelAlpha"
)
```

Pair the spec with the property. A spatial spec on alpha or color overshoots past the target and flickers. It's the most common M3E motion bug.

Spring values (damping ratio / stiffness) on phones. Don't copy them into code. Read the scheme. They're here for specs, Figma prototypes, and review.

| Spec | Expressive | Standard | Approx. duration |
| --- | --- | --- | --- |
| Fast spatial | 0.6 / 800 | 0.9 / 1400 | 350ms |
| Default spatial | 0.8 / 380 | 0.9 / 700 | 500ms |
| Slow spatial | 0.8 / 200 | 0.9 / 300 | 650ms (standard 750ms) |
| Fast effects | 1.0 / 3800 | 1.0 / 3800 | 150ms |
| Default effects | 1.0 / 1600 | 1.0 / 1600 | 200ms |
| Slow effects | 1.0 / 800 | 1.0 / 800 | 300ms |

Durations are the spring-to-curve equivalents for platforms without springs. Token values differ on wearables and tablets, which is one more reason to read the scheme.

When a design needs motion the scheme doesn't provide, or a system-triggered `tween`, use the token names from motion-design. Don't define a second motion object here. If motion isn't specified, ask.

**Reduce motion:** "Remove animations" sets the animator duration scale to 0, and Compose animations already honor it. Ambient loops and choreography still need an explicit check. See Reduce Motion in motion-design's `android-compose.md`.
