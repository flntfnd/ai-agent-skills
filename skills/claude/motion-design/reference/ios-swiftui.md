# iOS / SwiftUI Motion

SwiftUI animation for iOS, iPadOS, and macOS. `Motion.*` is the token enum from [cross-platform-tokens.md](cross-platform-tokens.md#definitions-per-platform). Use it. No literal springs or durations in views. HIG motion rules, Liquid Glass morphing, and haptics are in the `apple-platform` skill.

## Status

The OS baseline, SDK status, and what changed between releases live in `apple-platform/reference/platform-status.md`. The `.zoom` and `.crossFade` navigation transitions are iOS and iPadOS only. They're unavailable on macOS.

## Contents

- [Spring API](#spring-api)
- [Which Token Where](#which-token-where)
- [Implicit vs Explicit Animations](#implicit-vs-explicit-animations)
- [Gestures and Velocity](#gestures-and-velocity)
- [Keyframe Animations](#keyframe-animations)
- [PhaseAnimator](#phaseanimator)
- [Shared Element and Navigation Transitions](#shared-element-and-navigation-transitions)
- [Symbol Effects and Content Transitions](#symbol-effects-and-content-transitions)
- [Reordering](#reordering)
- [@Animatable Macro](#animatable-macro)
- [Performance](#performance)
- [Reduce Motion](#reduce-motion)

## Spring API

These are the forms you'll meet when reading or defining tokens. The presets are fixed bounces on `.spring(duration:bounce:)`, all with a default duration of 0.5:

```swift
.smooth                               // bounce 0
.snappy                               // bounce 0.15
.bouncy                               // bounce 0.3
.snappy(duration: 0.2)                // each preset takes duration and extraBounce
.bouncy(duration: 0.4, extraBounce: 0.2)

.spring(duration: 0.3, bounce: 0.2)   // bounce 0 = critically damped, > 0 overshoots,
                                      // < 0 = overdamped, flatter

// Older form, still common in existing code.
// duration == response, bounce == 1 - dampingFraction.
.spring(response: 0.35, dampingFraction: 0.7)
```

`duration` is perceptual, not the settle time. To run code when the motion has actually finished, use the completion form:

```swift
withAnimation(Motion.Spring.standard) {
    isExpanded = true
} completion: {
    focusField()
}
```

## Which Token Where

| Situation | Token |
| --- | --- |
| Press feedback, toggles, small controls | `Motion.Spring.snappy` |
| Sheets, cards, menus, navigation, list insert and delete | `Motion.Spring.standard` |
| Releasing a dragged element | `Motion.Spring.dragRelease` |
| Badge pop, playful emphasis | `Motion.Spring.expressive` |
| Loading and ambient loops | `Motion.Ease.ambient` |
| System-triggered appear and disappear | `Motion.Ease.enter`, `Motion.Ease.exit` |

## Implicit vs Explicit Animations

```swift
// Implicit: attached to a view, runs when the watched value changes.
// For a single view reacting to its own state.
RoundedRectangle(cornerRadius: Radius.card)
    .scaleEffect(isActive ? 1.05 : 1.0)
    .animation(Motion.Spring.snappy, value: isActive)

// Explicit: wraps the state change; everything depending on that state
// animates together. For event-driven, multi-view changes.
Button("Expand") {
    withAnimation(Motion.Spring.standard) {
        isExpanded.toggle()
    }
}
```

Always pass `value:` to `.animation`. The form without it animates every change to the view, including ones you didn't intend, and is deprecated.

## Gestures and Velocity

Springs carry velocity across interruption. Retarget a property that's mid-spring and it continues from its current speed. Gesture callbacks also track velocity automatically, so a spring started in `onEnded` begins at the speed the finger was moving.

```swift
@State private var offset: CGSize = .zero

card
    .offset(offset)
    .gesture(
        DragGesture()
            .onChanged { value in
                offset = value.translation          // no animation while tracking the finger
            }
            .onEnded { _ in
                withAnimation(Motion.Spring.dragRelease) {
                    offset = .zero                  // starts with the drag's velocity
                }
            }
    )
```

`DragGesture.Value.velocity` is there when the release behavior itself depends on speed, like dismissing on a fast flick.

## Keyframe Animations

For multi-step choreography a single spring can't describe. Each track animates one property on its own timeline. The segment durations are the choreography and stay literal.

```swift
struct PopValues {
    var scale = 1.0
    var offsetY = 0.0
}

CardView()
    .keyframeAnimator(initialValue: PopValues(), trigger: isActive) { content, value in
        content
            .scaleEffect(value.scale)
            .offset(y: value.offsetY)
    } keyframes: { _ in
        KeyframeTrack(\.scale) {
            CubicKeyframe(0.95, duration: 0.1)     // quick compress
            SpringKeyframe(1.02, duration: 0.2)    // spring past rest
            SpringKeyframe(1.0, duration: 0.15)    // settle
        }
        KeyframeTrack(\.offsetY) {
            CubicKeyframe(-8, duration: 0.15)
            SpringKeyframe(0, duration: 0.3)
        }
    }
```

`LinearKeyframe` interpolates straight, `CubicKeyframe` curves through its neighbors, `SpringKeyframe` springs toward the value, `MoveKeyframe` jumps.

Keyframe animations play to completion and don't hand off velocity when interrupted. They're for one-shot choreography, never for something the user can grab mid-flight. The content closure runs every frame. Keep it cheap.

## PhaseAnimator

Steps through discrete states, continuously or once per trigger. This is system-driven motion, so it takes an ease token.

```swift
// Continuous: loading indicator
LoadingDot()
    .phaseAnimator([false, true]) { content, isActive in
        content
            .scaleEffect(isActive ? 1.3 : 1.0)
            .opacity(isActive ? 0.6 : 1.0)
    } animation: { _ in
        Motion.Ease.ambient
    }

// Once per trigger: confirmation pulse
Image(systemName: "checkmark.circle.fill")
    .phaseAnimator([1.0, 1.2, 1.0], trigger: saveCount) { content, scale in
        content.scaleEffect(scale)
    }
```

## Shared Element and Navigation Transitions

`matchedGeometryEffect` morphs between two views in the same hierarchy that share an ID. Only one of them can be in the hierarchy at a time. Rendering both breaks the animation.

```swift
@Namespace private var heroNamespace

if !isExpanded {
    Thumbnail(item)
        .matchedGeometryEffect(id: item.id, in: heroNamespace)
        .onTapGesture {
            withAnimation(Motion.Spring.standard) { isExpanded = true }
        }
} else {
    Detail(item)
        .matchedGeometryEffect(id: item.id, in: heroNamespace)
}
```

Across a navigation push or a presentation, use the zoom navigation transition instead (iOS and iPadOS). It's interactive, interruptible, and follows the dismiss gesture:

```swift
@Namespace private var namespace

NavigationLink {
    DetailView(item)
        .navigationTransition(.zoom(sourceID: item.id, in: namespace))
} label: {
    Thumbnail(item)
        .matchedTransitionSource(id: item.id, in: namespace)
}
```

For a sheet that should appear in place instead of sliding up, use the cross-fade transition (iOS and iPadOS). `AnyNavigationTransition` type-erases a transition chosen at runtime.

```swift
.sheet(isPresented: $showDetail) {
    DetailSheet()
        .presentationDetents([.medium])
        .navigationTransition(.crossFade)
}
```

## Symbol Effects and Content Transitions

SF Symbols animate through `symbolEffect`. Don't hand-build scale and rotation for what a symbol effect already does.

```swift
// Discrete: plays once each time the value changes
Image(systemName: "bell.fill")
    .symbolEffect(.bounce, value: notificationCount)

// Indefinite: runs while active
Image(systemName: "arrow.triangle.2.circlepath")
    .symbolEffect(.rotate, isActive: isSyncing)

// Swapping one symbol for another
Image(systemName: isMuted ? "speaker.slash.fill" : "speaker.wave.2.fill")
    .contentTransition(.symbolEffect(.replace))

// Text that changes value: animate the digits, not a cross-fade of the label
Text(total, format: .number)
    .contentTransition(.numericText())
    .animation(Motion.Spring.snappy, value: total)
```

Effects: `appear`, `disappear`, `bounce`, `pulse`, `scale`, `variableColor`, `replace`, `wiggle`, `rotate`, `breathe`, `drawOn`, `drawOff`.

## Reordering

Drag-to-reorder works in any stack, grid, list, or custom layout. The system supplies the lift, the moving placeholder, and the drop animation. Don't build this by hand.

```swift
VStack {
    ForEach(landmarks) { landmark in
        LandmarkRow(landmark)
    }
    .reorderable()
}
.reorderContainer(for: Landmark.self) { difference in
    let moved = landmarks.filter { difference.sources.contains($0.id) }
    landmarks.removeAll { difference.sources.contains($0.id) }
    switch difference.destination.position {
    case .before(let id):
        let index = landmarks.firstIndex { $0.id == id } ?? landmarks.endIndex
        landmarks.insert(contentsOf: moved, at: index)
    case .end:
        landmarks.append(contentsOf: moved)
    }
}
```

Containers holding several collections use `reorderable(collectionID:)` and `reorderContainer(for:in:isEnabled:move:)`.

## @Animatable Macro

Synthesizes `animatableData` from a type's stored properties, replacing hand-written `AnimatablePair` nesting:

```swift
@Animatable
struct WaveShape: Shape {
    var amplitude: Double
    var frequency: Double
    var phase: Double
    @AnimatableIgnored var isMirrored: Bool   // excluded from interpolation

    func path(in rect: CGRect) -> Path {
        Path()   // draw using amplitude, frequency, phase
    }
}
```

## Performance

Built-in animatable modifiers (`.scaleEffect()`, `.opacity()`, `.rotationEffect()`, `.offset()`) are cheap. SwiftUI interpolates them without re-running your view code. A custom `Animatable` type, a keyframe content closure, or a `TimelineView` re-evaluates on the main thread every frame, at up to 120Hz. Keep layout-heavy subtrees, data access, and formatting out of anything that re-evaluates per frame.

When a parent's size animates and its children jump instead of following, add `.geometryGroup()` to the parent.

## Reduce Motion

The policy is in [cross-platform-tokens.md](cross-platform-tokens.md#reduced-motion-policy).

```swift
@Environment(\.accessibilityReduceMotion) private var reduceMotion

// Replace spatial motion with a crossfade
var transition: AnyTransition {
    reduceMotion ? .opacity : .move(edge: .trailing).combined(with: .opacity)
}

// Swap an expressive spring for the fade token
withAnimation(reduceMotion ? Motion.Ease.fade : Motion.Spring.expressive) {
    isPresented = true
}
```

System navigation and sheet transitions adapt on their own. Custom motion doesn't. Parallax, `scrollTransition` effects, continuous `PhaseAnimator` loops, indefinite symbol effects, and keyframes all need the check.
