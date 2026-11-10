# Color, Typography, and Spacing

How color, type, and spacing are written on Apple platforms. Which colors to use comes from the `color-system` skill (palette, light and dark semantic mappings, contrast). Token names come from the `figma-design-system` skill's `reference/token-architecture.md`: `color/semantic/background/elevated` is `Color.Semantic.Background.elevated`, `spacing/5` is `Spacing.s5`, `radius/2xl` is `Radius.r2xl`.

## Contents

- [Semantic System Colors](#semantic-system-colors)
- [Custom Semantic Tokens](#custom-semantic-tokens)
- [Display P3](#display-p3)
- [Color on Glass](#color-on-glass)
- [Typography Scale](#typography-scale)
- [Spacing and Radius Tokens](#spacing-and-radius-tokens)

## Semantic System Colors

When a system color covers the role, use it directly. Don't wrap it in a project token. System colors adapt automatically to light, dark, and increased contrast. The design file's semantic token carries the system name in its code syntax: `color/semantic/background/primary` is `Color(.systemBackground)`, `text/primary` is `Color(.label)`, `text/secondary` is `Color(.secondaryLabel)`, `border/default` is `Color(.separator)`, `interactive/primary` is `Color.accentColor`.

Prefer SwiftUI's own styles. They work on every platform and pick up vibrancy on glass and materials:

```swift
.foregroundStyle(.primary)      // also .secondary, .tertiary, .quaternary
.background(.background)        // also .background.secondary, .background.tertiary
.foregroundStyle(.tint)         // accent color
.foregroundStyle(.separator)
```

The named UIKit colors are the fuller set on iOS and iPadOS: `Color(.systemBackground)`, `Color(.secondarySystemBackground)`, `Color(.systemGroupedBackground)`, `Color(.label)`, `Color(.secondaryLabel)`, `Color(.systemFill)`, `Color(.separator)`, and their tertiary and quaternary levels. They don't exist on macOS. A shared view uses the styles above or a custom token.

## Custom Semantic Tokens

Project tokens fill the gaps: brand colors, status colors, product-specific surfaces, anything the system palette doesn't cover. Never hardcode hex values in views.

The five groups are fixed: `Background`, `Text`, `Border`, `Status`, `Interactive`. The values live in the asset catalog, one color set per token, each with Any and Dark appearances plus a High Contrast variant of both (four values per token), aliasing the palette `color-system` chose. Xcode generates a typed symbol for every color set, so the Swift side is only naming:

```swift
extension Color {
    enum Semantic {
        enum Background {
            static let elevated = Color(.backgroundElevated)
        }
        enum Status {
            static let success = Color(.statusSuccess)
            static let warning = Color(.statusWarning)
            static let error = Color(.statusError)
        }
        enum Interactive {
            static let primaryHover = Color(.interactivePrimaryHover)
        }
    }
}

// Call site
.background(Color.Semantic.Background.elevated)
```

No `UIColor` or `NSColor` dynamic providers in SwiftUI code. The asset catalog covers appearance, contrast, and gamut on every platform.

Provide light and dark values even for an app that ships in one appearance. Glass flips between them based on what's behind it. Design for true dark first. If it works in dark, it almost always works in light. The reverse isn't always true.

Contrast ratios and how to measure them against glass are in `accessibility.md`.

## Display P3

Use Display P3 for richer colors on capable devices. Test on sRGB too, since P3 colors can look muted there. Set the gamut on the color set in the asset catalog. In code, when a color has to be computed:

```swift
Color(.displayP3, red: 1.0, green: 0.27, blue: 0.23)
```

## Color on Glass

Text on glass gets automatic vibrant treatment. Don't fight it. Use `.foregroundStyle(.primary)` or `.foregroundStyle(.white)` depending on context and let vibrancy handle legibility.

Symbols and text on bars are monochrome by default and flip between dark and light with the content behind them. Glass itself has no color. It takes color from what's under it. Add color sparingly. For emphasis, tint the glass background of the one primary action. Don't color labels. If the content layer is already colorful, leave the bars monochrome.

## Typography Scale

All type uses the system font (SF Pro) unless a custom typeface is explicitly designed in. Support Dynamic Type.

```swift
// iOS and iPadOS, default Dynamic Type size. These are the HIG values.
.font(.largeTitle)   // 34pt regular
.font(.title)        // 28pt regular
.font(.title2)       // 22pt regular
.font(.title3)       // 20pt regular
.font(.headline)     // 17pt semibold
.font(.body)         // 17pt regular (base)
.font(.callout)      // 16pt regular
.font(.subheadline)  // 15pt regular
.font(.footnote)     // 13pt regular
.font(.caption)      // 12pt regular
.font(.caption2)     // 11pt regular
```

macOS uses the same style names at smaller sizes (body is 13pt, large title 26pt), so a shared view that uses text styles is correct on both. Each style has an emphasized weight: bold for the titles, semibold for the rest. Get it with `.bold()` or `.fontWeight`, not a new size.

Use semantic sizes. Never hardcode point values. A custom size is a token, and it has to scale. `Font.system(size:)` on its own is fixed and ignores Dynamic Type.

```swift
struct DisplayLarge: ViewModifier {
    @ScaledMetric(relativeTo: .largeTitle) private var size = Typography.Size.displayLg

    func body(content: Content) -> some View {
        content.font(.system(size: size, weight: .bold))
    }
}

enum Typography {
    enum Size {
        static let displayLg: CGFloat = 40   // typography/size/display-lg
        static let displaySm: CGFloat = 32   // typography/size/display-sm
    }
}
```

## Spacing and Radius Tokens

A finite set. Nothing outside the scale. Names and steps are the design file's (`spacing/1` to `spacing/12`, `radius/none` to `radius/sheet`).

```swift
enum Spacing {
    static let s1: CGFloat = 2
    static let s2: CGFloat = 4
    static let s3: CGFloat = 8
    static let s4: CGFloat = 12
    static let s5: CGFloat = 16   // base
    static let s6: CGFloat = 20
    static let s7: CGFloat = 24
    static let s8: CGFloat = 32
    static let s9: CGFloat = 40
    static let s10: CGFloat = 48
    static let s11: CGFloat = 64
    static let s12: CGFloat = 80
}

enum Radius {
    static let none: CGFloat = 0
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let r2xl: CGFloat = 28   // panels
    static let sheet: CGFloat = 34
}
```

`radius/pill` has no number in code. It's `.capsule`. Inside a rounded container, prefer a concentric shape over any fixed radius (`liquid-glass.md`).
