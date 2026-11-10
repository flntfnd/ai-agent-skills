# Animation, Motion, and Interaction

Apple-specific motion: what the platform already animates, glass, symbols, gestures, haptics, Reduce Motion.

Motion tokens aren't defined here. The `motion-design` skill owns them. Its `reference/cross-platform-tokens.md` defines `Motion.Spring.snappy`, `.standard`, `.expressive`, `.dragRelease` and `Motion.Ease.enter`, `.exit`, `.standard`, `.fade`, `.ambient`. Its `reference/ios-swiftui.md` has the SwiftUI animation API (springs, keyframes, phase animators, transitions). No raw spring or duration values at a call site.

## Contents

- [Core Principle](#core-principle)
- [Platform Rules](#platform-rules)
- [Liquid Glass Motion](#liquid-glass-motion)
- [Symbol Effects](#symbol-effects)
- [Gestures](#gestures)
- [Haptics](#haptics)
- [Reduce Motion](#reduce-motion)

## Core Principle

Motion communicates. It orients, confirms, and guides. It doesn't decorate.

Every animation answers one of these questions:
- Where did that go?
- What just happened?
- What can I do next?

If it doesn't answer any of those, cut it.

## Platform Rules

User-triggered motion gets a spring. System-triggered motion gets an ease token: enter for arrivals, exit for departures.

Match direction to spatial relationships: if a view slides in from the right, it dismisses to the right.

Never cut between states. The weight of the animation matches the weight of the change: `snappy` for small toggles, `standard` for layout changes, `expressive` for expanding and collapsing glass.

Elements materialize. They appear and disappear by modulating the material, not by popping in. Match that in custom transitions with opacity plus scale. No hard cuts.

Navigation pushes, sheets, the tab bar, toolbars, and menus already move correctly. Don't re-animate them.

## Liquid Glass Motion

Liquid Glass has its own physics. `.glassEffect(.regular.interactive())` adds scale on press, bounce, shimmer, and touch-point illumination, and on macOS a pointer response. Don't layer custom animations on top.

Morphing is user-triggered, so it gets a spring:

```swift
withAnimation(Motion.Spring.expressive) {
    isExpanded.toggle()
}
```

Set how a glass element enters and leaves with `glassEffectTransition(_:)` (`.matchedGeometry` or `.materialize`), not a hand-built transition. See `liquid-glass.md`.

## Symbol Effects

SF Symbols animate natively. Use the built-in effects before drawing anything custom.

```swift
// Swap one symbol for another (state toggle)
Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
    .contentTransition(.symbolEffect(.replace))

// One-shot effect when a value changes
Image(systemName: "arrow.down.circle")
    .symbolEffect(.bounce, value: downloadCount)

// Ongoing effect while a condition holds
Image(systemName: "wifi")
    .symbolEffect(.variableColor.iterative, isActive: isConnecting)

// Number changes
Text(count, format: .number)
    .contentTransition(.numericText())
```

Available effects: `.bounce`, `.pulse`, `.scale`, `.variableColor`, `.appear`, `.disappear`, `.replace`, `.wiggle`, `.rotate`, `.breathe`, `.drawOn`, `.drawOff`.

Match the effect to the meaning: bounce confirms, pulse and breathe signal ongoing activity, variable color shows progress or strength, draw on suits completion. An indefinite effect stops when the state it describes ends.

## Gestures

Swipe to go back is a system behavior. Never remove or interfere with it.

Track the finger with no animation, then release into a spring so the drag's velocity carries over:

```swift
.gesture(
    DragGesture()
        .onChanged { value in offset = value.translation }
        .onEnded { _ in
            withAnimation(Motion.Spring.dragRelease) { offset = .zero }
        }
)
```

Selectable `Text` has its own selection gestures under the 27 SDK. If a custom gesture on it has to win, use `.highPriorityGesture()`.

## Haptics

Use system haptics for confirmations, errors, and selection changes. Never build a custom haptic when a system pattern exists. In SwiftUI that's `sensoryFeedback`, driven by the state change itself. No UIKit feedback generators.

```swift
// Selection
.sensoryFeedback(.selection, trigger: selectedTab)

// Impact
.sensoryFeedback(.impact(weight: .medium), trigger: dropCount)

// Outcome
.sensoryFeedback(.success, trigger: saveCount)

// Only for some changes
.sensoryFeedback(trigger: phase) { _, new in
    new == .failed ? .error : nil
}
```

One haptic per event the user caused or needs to know about. Standard controls already play their own; don't double them.

## Reduce Motion

Always respect `accessibilityReduceMotion`. Replace spatial motion with opacity.

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion

var transition: AnyTransition {
    reduceMotion ? .opacity : .move(edge: .trailing).combined(with: .opacity)
}
```

System transitions and Liquid Glass adapt on their own. Custom motion doesn't: parallax, scroll effects, continuous loops, indefinite symbol effects, `TimelineView` drawing.
