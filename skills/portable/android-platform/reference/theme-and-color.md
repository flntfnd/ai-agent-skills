# Theme & Color

Versions live in the Version Snapshot in SKILL.md, nowhere else. Palette values belong to the `color-system` skill. Token naming belongs to the Figma skill's `reference/token-architecture.md`. On Android the code name of a color token is its Material role (`MaterialTheme.colorScheme.surface`). This file is wiring and Material's own rules.

## Contents
- [Gradle Setup](#gradle-setup)
- [Theme Setup](#theme-setup)
- [Color Roles](#color-roles)
- [Elevation](#elevation)
- [Dynamic Color](#dynamic-color)
- [Contrast Levels](#contrast-levels)
- [Pure Black](#pure-black)
- [Baseline Palette Reference](#baseline-palette-reference)

## Gradle Setup

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")   // Compose compiler, versioned with Kotlin
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:<BOM from Version Snapshot>"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material3:material3-adaptive-navigation-suite")
    implementation("androidx.compose.material3.adaptive:adaptive")
    implementation("androidx.compose.material3.adaptive:adaptive-layout")
    implementation("androidx.compose.material3.adaptive:adaptive-navigation")
    implementation("androidx.activity:activity-compose")
}
```

M3E needs `material3` 1.5.0, and the BOM doesn't map to it yet. An explicit version overrides the BOM for that artifact only.

```kotlin
// Only while the BOM still maps material3 to 1.4.x
implementation("androidx.compose.material3:material3:<1.5.0 version from Version Snapshot>")
implementation("androidx.compose.material3:material3-adaptive-navigation-suite:<same version>")
```

Shipping a release candidate is a decision, not a default. If the project has to stay on stable artifacts, there's no M3E, and the app builds on baseline M3 until 1.5.0 is stable. Raise it before starting.

## Theme Setup

One theme composable supplies color, typography, shapes, and motion. Everything reads them back through `MaterialTheme.*`. `MaterialExpressiveTheme` is `MaterialTheme` with expressive defaults: a parameter left null falls back to the expressive light scheme, `MotionScheme.expressive()`, and the default shapes and typography. On 1.4.0, call `MaterialTheme` with the same color, shape, and typography arguments.

```kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> AppDarkColorScheme     // darkColorScheme(...) built from color-system values
        else -> AppLightColorScheme         // lightColorScheme(...)
    }

    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        motionScheme = MotionScheme.expressive(),
        shapes = AppShapes,
        typography = AppTypography,
        content = content
    )
}
```

Fill every role in the fallback schemes. An unset role silently keeps the purple baseline. There's no expressive dark scheme function, so the dark fallback is `darkColorScheme(...)`.

In the activity, call `enableEdgeToEdge()` in `onCreate` before `setContent`, and set `android:windowSoftInputMode="adjustResize"` so IME insets get delivered. Inset handling is in components-and-navigation.md.

## Color Roles

M3 color is role-based. Reference a color by what it does, never by hue. The scheme has 26 standard roles (primary, secondary, tertiary, and error groups, each with `on` and container variants; surface; outline; inverse) plus add-on roles (`surfaceDim`, `surfaceBright`, the five `surfaceContainer*` steps, and the `*Fixed` accents that stay the same in light and dark).

- Pair every fill with its `on` role. `onPrimaryContainer` on `primaryContainer` is always legible. `primary` text on `primaryContainer` isn't.
- `surface` is the background. The `surfaceContainer` steps are for navigation areas, cards, sheets, and dialogs. `onSurface` and `onSurfaceVariant` carry text and icons on any of them.
- `outline` is for boundaries that have to be seen (text field borders). `outlineVariant` is decorative (dividers), for places where other elements already provide the contrast.
- Navigation bar and rail: container `surfaceContainer`, active indicator `secondaryContainer`, active icon `onSecondaryContainer`, active label `secondary`, inactive `onSurfaceVariant`.
- Status colors (success, warning) are app-level additions to the theme. Don't borrow `tertiary` for them. It changes with the wallpaper.

## Elevation

Elevation is levels, not arbitrary dp, and it shows as tone first: a higher surface uses a higher `surfaceContainer` step. Surface tint is deprecated. Add a shadow only where a surface needs separation from a busy background, or to invite interaction.

| Level | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| dp | 0 | 1 | 3 | 6 | 8 | 12 |

Hover and focus usually raise a component by one level. Keep to a small number of levels per screen.

## Dynamic Color

Android 12 (API 31) and up. Design with it on by default. It's the expected Android experience. The brand scheme is the fallback for older devices and a user-selectable fixed palette.

- The primary hue is unknown at design time, so no meaning can depend on a specific hue.
- Brand-critical elements (logo lockups, illustrations) keep fixed colors and sit on neutral surfaces.
- Test with at least three contrasting wallpapers, in light and dark.

## Contrast Levels

Color roles support three contrast levels: standard, medium, and high. On Android 14 (API 34) and up the user picks one in system settings, and dynamic schemes already follow it. A fixed brand scheme doesn't. Export all three levels (Material Theme Builder does this) and select by `UiModeManager.contrast`, which runs from 0 (standard) to 1 (high).

```kotlin
val contrast = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
    LocalContext.current.getSystemService(UiModeManager::class.java).contrast
} else 0f
```

## Pure Black

I offer pure black for OLED screens as a user preference layered over the dark scheme. It's never the default dark theme. Default dark surfaces are tonal so the container steps stay distinguishable.

```kotlin
fun ColorScheme.pureBlack(lifted: ColorScheme): ColorScheme = copy(
    background = Color.Black,
    surface = Color.Black,
    surfaceDim = Color.Black,
    surfaceContainerLowest = Color.Black,
    // container steps come from a second scheme defined in color-system,
    // so cards and sheets stay visible against black
    surfaceContainerLow = lifted.surfaceContainerLow,
    surfaceContainer = lifted.surfaceContainer,
    surfaceContainerHigh = lifted.surfaceContainerHigh,
    surfaceContainerHighest = lifted.surfaceContainerHighest
)
```

## Baseline Palette Reference

Dark theme isn't optional. Design both from the start and test every state in both.

The M3 baseline values, with no dynamic color. Use them to recognize an unthemed screen, and as a last-resort fallback only.

| Role | Light | Dark |
| --- | --- | --- |
| Surface | `#FEF7FF` | `#141218` |
| Surface container | `#F3EDF7` | `#211F26` |
| Surface container high | `#ECE6F0` | `#2B2930` |
| Primary | `#6750A4` | `#D0BCFF` |
| On-surface | `#1D1B20` | `#E6E0E9` |
| Outline | `#79747E` | `#938F99` |
