# Custom Rendering

What separates native apps that feel hand-crafted from ones assembled from stock components. Use these APIs when standard SwiftUI views can't produce the result.

Samples use literal colors and sizes to stay short. In a project they come from tokens.

## Contents

- [SwiftUI Canvas](#swiftui-canvas)
- [Custom Animatable Conformances](#custom-animatable-conformances)
- [Advanced AttributedString Typography](#advanced-attributedstring-typography)
- [Shader Effects](#shader-effects)
- [Metal](#metal)

## SwiftUI Canvas

Direct 2D drawing within the SwiftUI layout system. Same performance as `drawRect` without the UIKit overhead.

```swift
// Generative waveform (audio player, visualizer)
Canvas { context, size in
    let midY = size.height / 2
    let samples: [Float] = audioEngine.currentSamples  // [0...1]

    var path = Path()
    path.move(to: CGPoint(x: 0, y: midY))

    for (i, sample) in samples.enumerated() {
        let x = size.width * CGFloat(i) / CGFloat(samples.count)
        let y = midY - CGFloat(sample) * midY * 0.9
        path.addLine(to: CGPoint(x: x, y: y))
    }

    context.stroke(
        path,
        with: .linearGradient(
            Gradient(colors: [.cyan, .purple]),
            startPoint: .zero,
            endPoint: CGPoint(x: size.width, y: 0)
        ),
        lineWidth: 1.5
    )
}
.frame(height: 80)
```

Canvas draws in immediate mode. No per-element views, no per-element accessibility. Give the Canvas itself an accessibility label or representation.

Animate a Canvas by wrapping it in `TimelineView(.animation)`. It re-runs the drawing every frame, so pause the schedule (`.animation(paused:)`) when the view is offscreen or Reduce Motion is on.

## Custom Animatable Conformances

The `@Animatable` macro synthesizes `animatableData` from the stored properties. Mark the ones that shouldn't interpolate with `@AnimatableIgnored`. It back-deploys to iOS 13. Don't hand-write `AnimatablePair`.

```swift
@Animatable
struct WaveShape: Shape {
    var amplitude: CGFloat
    var phase: CGFloat
    @AnimatableIgnored var frequency: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 2

        path.move(to: CGPoint(x: 0, y: rect.midY))
        for x in stride(from: 0, to: rect.width, by: step) {
            let relativeX = x / rect.width
            let y = rect.midY + sin(relativeX * frequency * .pi * 2 + phase) * amplitude
            path.addLine(to: CGPoint(x: x, y: y))
        }
        return path
    }
}

// Usage
WaveShape(amplitude: isActive ? 20 : 0, phase: currentPhase, frequency: 3)
    .stroke(.tint, lineWidth: 2)
    .animation(Motion.Spring.standard, value: isActive)
```

## Advanced AttributedString Typography

Rich inline typography without UIKit:

```swift
// Mixed weight / color inline text
var attributed = AttributedString("Design")
attributed.font = .system(size: 48, weight: .bold)

var accent = AttributedString(" system.")
accent.font = .system(size: 48, weight: .light, design: .serif)
accent.foregroundColor = .secondary

let combined = attributed + accent

Text(combined)
    .tracking(1.2)
```

`TextEditor` edits `AttributedString` directly, with `AttributedTextSelection` for the selection. A custom `TextRenderer` applies to selectable text too (27), so per-glyph effects don't cost text selection.

## Shader Effects

The first choice for a custom pixel effect. SwiftUI runs a Metal shader function on a view's rendered output. No view representable, no render loop to own.

```swift
// Custom color transformation
// Write a .metal file with the matching function signature
.colorEffect(ShaderLibrary.myColorShader(
    .float(time),
    .float(intensity)
))

// Custom geometry distortion
.distortionEffect(ShaderLibrary.waveDistortion(
    .float(time),
    .float(amplitude)
), maxSampleOffset: CGSize(width: 20, height: 20))
```

`.layerEffect` can sample the whole layer. Don't use it to imitate Liquid Glass. The system material is the only correct glass.

## Metal

Use raw Metal only when shader effects and Canvas aren't enough: particle systems at scale, multi-pass rendering, compute. SwiftUI has no Metal view, so this is the one place a UIKit bridge is the right answer. Keep it to a single representable wrapping `MTKView`:

```swift
import MetalKit
import SwiftUI

struct MetalShaderView: UIViewRepresentable {
    var uniforms: ShaderUniforms  // Your custom struct

    func makeCoordinator() -> Renderer { Renderer() }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView(frame: .zero, device: MTLCreateSystemDefaultDevice())
        view.delegate = context.coordinator
        view.clearColor = MTLClearColorMake(0, 0, 0, 0)
        view.isOpaque = false
        return view
    }

    func updateUIView(_ view: MTKView, context: Context) {
        context.coordinator.uniforms = uniforms
    }
}

final class Renderer: NSObject, MTKViewDelegate {
    var uniforms = ShaderUniforms()

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) { }

    func draw(in view: MTKView) {
        // Encode a render pass using `uniforms`
    }
}
```

On macOS the same view is an `NSViewRepresentable` with `makeNSView` / `updateNSView`.

The Performance rules in `liquid-glass.md` apply here too. Any continuous custom rendering spends the same GPU and thermal budget as glass.
