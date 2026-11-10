# Accessibility

The system handles a lot automatically. Don't fight it.

## What the system adapts

- **Reduce Transparency**: glass gets frostier and more opaque. Standard components and `.glassEffect()` fall back on their own.
- **Increase Contrast**: stark colors, borders, and higher-contrast backgrounds on glass elements.
- **Reduce Motion**: Liquid Glass tones down its elastic interactions. Cut or minimize your own animations and use opacity transitions.
- **Liquid Glass slider** (Settings > Appearance > Liquid Glass): more clear to more tint. Unavailable while Reduce Transparency or Increase Contrast is on, so it never combines with them.

Test with each one on. Test custom glass at both ends of the slider. Reduce Transparency is the one that gets missed: the UI still has to show hierarchy and depth with no translucency.

## What the app owns

System glass needs no code for any of that. Don't swap `.glassEffect()` for `.identity` when Reduce Transparency is on. That removes the background the system would have made opaque and leaves the label floating on content.

The environment values are for translucency and motion you draw yourself: custom materials, shader effects, gradients over media, hand-built transitions.

```swift
@Environment(\.accessibilityReduceTransparency) private var reduceTransparency
@Environment(\.colorSchemeContrast) private var contrast

var scrim: some ShapeStyle {
    reduceTransparency ? AnyShapeStyle(.background) : AnyShapeStyle(.ultraThinMaterial)
}
```

`accessibilityReduceMotion` is in `motion-interaction.md`.

Every custom color needs four variants: light, dark, and an increased-contrast version of each. System colors already have them.

## Requirements

Dynamic Type: all text scales. No fixed-height containers that truncate text. Custom sizes scale through `@ScaledMetric` or a text-style-relative font (`color-typography.md`).

VoiceOver: every interactive element has an accessibility label. Icon-only glass buttons and toolbar items get explicit ones.

Touch targets: 44x44pt minimum on iOS and iPadOS. Always. Don't shrink tap areas to fit a tighter glass composition. The HIG allows 28x28 as a floor. I don't go below 44. On macOS the HIG default is 28x28.

Contrast ratios (WCAG AA, the values Accessibility Inspector checks):
- Text up to 17pt: 4.5:1
- Text 18pt and larger, or bold at any size: 3:1
- Interactive elements against adjacent colors: 3:1

Measure these **with the glass applied**, against the real content behind it, not against the glass fill color. The material can cut contrast a lot depending on what's under it. Test the worst-case background, at the clear end of the Liquid Glass slider, in both appearances.
