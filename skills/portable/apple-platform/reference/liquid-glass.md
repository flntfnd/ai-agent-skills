# Liquid Glass

The rule is in SKILL.md: navigation layer only, never content, and cards are content. This file is the API and the values. The API came with the 26 SDK and didn't change in 27. What 27 changed is how the material renders and how much the user controls it (`platform-status.md`).

## Contents

- [Material Variants](#material-variants)
- [Core API](#core-api)
- [Shapes](#shapes)
- [GlassEffectContainer](#glasseffectcontainer)
- [Morphing and Transitions](#morphing-and-transitions)
- [Button Styles](#button-styles)
- [What the User Controls](#what-the-user-controls)
- [Dynamic Adaptation](#dynamic-adaptation)
- [Glass Levels](#glass-levels)
- [Token Reference](#token-reference)
- [Layering Anti-Patterns](#layering-anti-patterns)
- [Performance](#performance)

## Material Variants

`.regular` is the default. Use it for all navigation-layer controls and for anything that carries text.

`.clear` is for floating controls over media-rich backgrounds only. Highly translucent, limited adaptivity. Three conditions, all required: the element sits over media-rich content, a dimming layer won't hurt that content, and the foreground is bold and bright. If any one fails, use `.regular`. Over bright content, put a dark dimming layer under the glass (HIG: 35% opacity). Over dark content, or over AVKit's standard playback controls, skip the dimming layer.

`.identity` turns the effect off. Use it for conditional toggling so the view stays in the hierarchy.

## Core API

```swift
// Signature: glassEffect(_ glass: Glass = .regular, in shape: some Shape = DefaultGlassEffectShape())
// Glass: .regular, .clear, .identity, plus .tint(_:) and .interactive(_:)

// Default: regular glass in a capsule
.glassEffect()

// Explicit variant and shape
.glassEffect(.regular, in: .capsule)

// Conditional
.glassEffect(isFloating ? .regular : .identity)

// Tinted (semantic meaning only, not decoration)
.glassEffect(.regular.tint(.blue))

// Interactive: reacts to touch and pointer the way a glass button does
.glassEffect(.regular.interactive())

// Chain them
.glassEffect(.regular.tint(.orange).interactive())
```

There is no `isEnabled:` parameter. Toggle with `.identity`.

Apply `glassEffect` after padding, font, and frame. The material is anchored to the view's bounds, padding included.

Tinting is for semantic meaning (primary action, active state). Not decoration.

`.interactive()` isn't iOS-only. It responds to touch on iOS and to the pointer on macOS.

## Shapes

```swift
.glassEffect(in: .capsule)                                  // default
.glassEffect(in: .circle)
.glassEffect(in: .rect(cornerRadius: Radius.r2xl))
.glassEffect(in: .rect(corners: .concentric))               // concentric with the container
.glassEffect(in: .rect(corners: .concentric(minimum: 12)))  // concentric, never square
```

Use a concentric shape when a glass element sits near the corners of its container, a sheet, or the window. The radius resolves from the container, so nothing is hardcoded. A custom container declares its shape with `.containerShape(_:)`. For custom drawing, read `GeometryProxy.concentricCornerRadii` (27).

## GlassEffectContainer

Multiple glass elements go inside a `GlassEffectContainer`. It renders their shapes together. That's what lets them blend and morph, and what keeps rendering cheap.

```swift
GlassEffectContainer(spacing: 20) {
    HStack(spacing: 12) {
        Button("Edit") { }.glassEffect()
        Button("Delete") { }.glassEffect()
    }
}
```

`spacing` is the blend threshold. The larger it is, the sooner neighbouring shapes merge as they approach. Container spacing larger than the layout spacing inside it blends the shapes at rest. Equal or smaller keeps them separate until something animates.

To make several views share one glass shape at rest, give them the same union ID. Effects with the same shape, variant, and ID combine into one:

```swift
@Namespace private var glass

GlassEffectContainer(spacing: 20) {
    HStack(spacing: 20) {
        ForEach(tools) { tool in
            Image(systemName: tool.symbol)
                .frame(width: 44, height: 44)
                .glassEffect()
                .glassEffectUnion(id: tool.group, namespace: glass)
        }
    }
}
```

## Morphing and Transitions

Morphing needs three things: elements in the same `GlassEffectContainer`, a unique `glassEffectID` per element in a shared namespace, and an animated state change.

```swift
@Namespace private var namespace

GlassEffectContainer(spacing: 30) {
    Button(isExpanded ? "Collapse" : "Expand") {
        withAnimation(Motion.Spring.expressive) { isExpanded.toggle() }
    }
    .glassEffect()
    .glassEffectID("toggle", in: namespace)

    if isExpanded {
        Button("Action") { }
            .glassEffect()
            .glassEffectID("action", in: namespace)
    }
}
```

`glassEffectTransition(_:)` picks how an effect enters and leaves:

- `.matchedGeometry`: the default for effects within the container's spacing. The shape grows out of and collapses into its neighbour.
- `.materialize`: fades content and animates the material without matching geometry. For effects farther apart than the spacing.
- `.identity`: no change.

## Button Styles

```swift
Button("Secondary") { }.buttonStyle(.glass)
Button("Over video") { }.buttonStyle(.glass(.clear))
Button("Primary") { }.buttonStyle(.glassProminent).tint(.blue)
```

`.glassProminent` fills the glass with the tint (the accent color by default). One primary action per screen. Not multiple.

Use these before building a button out of `.glassEffect(.regular.interactive())`. The styles carry the system's press, hover, and focus behavior.

## What the User Controls

Four system settings change the material. Standard components and `.glassEffect()` follow all of them with no code. Apple doesn't expose the slider value to apps.

- **Liquid Glass slider** (Settings > Appearance > Liquid Glass; also on iPadOS and macOS). Left is more clear, right is more tint.
- **Reduce Transparency**: frostier, more opaque glass.
- **Increase Contrast**: stark fills and borders on glass elements.
- **Reduce Motion**: the elastic and morphing behavior is toned down.

The slider is unavailable while Reduce Transparency or Increase Contrast is on, so those two win. Design at the system default. Then check custom glass at both ends of the slider and under each accessibility setting. If a layout only works when the glass is very clear, it doesn't work. See `accessibility.md`.

## Dynamic Adaptation

Glass adapts automatically between light and dark based on what's behind it. Small elements (nav bars, tab bars) flip. Large elements (sidebars) are more opaque and adapt without flipping. Don't override this behavior.

## Glass Levels

```swift
enum GlassLevel {
    case chrome   // toolbars, tab bars, sidebars
    case surface  // floating panels, sheets, popovers. Not content cards.
    case element  // buttons, chips, pills
}
```

Define these in the token system and apply them consistently. Don't mix chrome-level and element-level glass in one container without a reason.

## Token Reference

```swift
enum GlassTokens {
    enum Padding {
        static let panel = EdgeInsets(top: Spacing.s5, leading: Spacing.s5, bottom: Spacing.s5, trailing: Spacing.s5)
        static let pill = EdgeInsets(top: 10, leading: 14, bottom: 10, trailing: 14)
        static let iconButton: CGFloat = Spacing.s4
    }
    enum Stroke {
        static let width: CGFloat = 1
        static let subtleOpacity: Double = 0.22
        static let strongOpacity: Double = 0.35
    }
    enum Shadow {
        static let radius: CGFloat = 18
        static let y: CGFloat = 8
        static let opacity: Double = 0.18
    }
}
```

Radii come from the shared `Radius` tokens in `color-typography.md`: `Radius.r2xl` (28) for floating panels, `Radius.sheet` (34) for sheets. Glass itself has no token. The system draws it.

`Stroke` and `Shadow` are for design-file approximations and for non-glass surfaces beside glass. Don't stack them on a `.glassEffect()`. Pills use `.capsule`.

## Layering Anti-Patterns

These are common mistakes. Don't make them.

Glass on glass: applying glass to elements that already sit on a glass surface. Creates visual noise and breaks depth hierarchy.

Glass on content: list rows, cards, media. The one system exception is a control that turns to glass only while it's being touched, like a slider knob or a toggle, and the system does that itself.

Custom backgrounds on system chrome: a `toolbarBackground`, a `presentationBackground`, or a visual effect view behind a bar, sheet, or popover fights the material and the scroll edge effect. Remove it. The system draws the background.

Overuse: applying glass to every surface because it looks cool. It stops looking like depth and starts looking like a mess.

Tinting everything: tint is for semantic meaning. If everything is tinted, nothing is.

Text on top of other text: a floating glass control over content text is a legibility collision. Move the control, or use the scroll edge effect (`scrollEdgeEffectStyle(_:for:)`, `.hard` for a firmer boundary). No hand-made scrim.

Motion overload: the glass has its own physics. Scroll animations, parallax, and shimmer on top of it make the interface restless and pull attention from the content.

## Performance

Too many containers hurt performance. So do too many effects outside a container. Limit how much glass is onscreen at once.

Don't run continuous animations on glass surfaces. Real-time lensing plus continuous animation is a thermal and battery problem on older hardware.

Don't apply the effect inside:
- Nested views (glass inside glass containers)
- High-frequency scrollable areas
- `List` or `LazyVStack` rows

Reserve Liquid Glass for static, top-level components: tab bars, toolbars, floating controls, sheets. Anything that's always visible and rarely redrawn.

Test on the oldest hardware the project supports. Glass is the most expensive material in the system, so that's where dropped frames show up first.

Profile with Instruments. Watch GPU usage and thermal state.
