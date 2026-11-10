# Organic / Biomorphic

Flowing, irregular shapes. Nature-derived curves, asymmetric balance, gradient washes that suggest light on living surfaces. Shapes feel grown rather than constructed. Palettes come from nature: earth, botanical green, sky, terracotta, sage.

**When to use**: Wellness, meditation, health, food, sustainability; products that benefit from a living-world, non-digital feeling.

**Not to be confused with**: Neumorphism and Claymorphism (soft and rounded, but regular geometry and shadow-driven), a friendly rounded UI (large uniform radii are still rectangles), Texture / Tactile (grain on regular geometry; Organic is about silhouette).

## Visual Signature

Identifiable at a glance by: blob-shaped backgrounds and containers with irregular silhouettes, soft gradients between nature-derived colors, asymmetric layout that doesn't snap to a visible grid, and a sense of warmth and imperfection.

**Structural requirements:**
- Containers: an irregular silhouette, from an asymmetric eight-value radius (for example `60% 40% 70% 30% / 40% 60% 30% 70%`), a blob clip-path, or a custom shape. No two neighbors share an outline.
- Background: gradient blobs or organic shapes as decorative layers behind content, off-axis.
- Color: nature palette. No pure black, no pure white, no saturated tech blue.
- Layout: intentionally asymmetric. Offset text columns, elements overlapping blob edges.
- Controls: pill-shaped. Buttons, chips, and inputs are the only regular geometry.

**Wrong if:** containers are rectangles with uniform radius (however large), layout is symmetric and grid-aligned, the palette is corporate or tech, the background is a flat solid, or motion is snappy.

## Token Modifications

```
radius: container asymmetric, 30-70% per corner, never uniform; control full pill

color/primitive (muted natural tones)
  terracotta #C4704A   sage #8FAB8A   sky #6B9FBF   sand #D4B896   earth #7B5C3E
color/semantic/text/primary       → warm dark brown (#3A2A1E), not black
color/semantic/background/primary → cream (#FBF6EE), not white
gradients (soft, two-stop, low contrast)
  sunrise #FFD4A3 → #FFA07A   forest #A8C5A0 → #5A7A5C   ocean #B3D4E8 → #6A9CB8

spacing: off the 8pt rhythm (18, 28, 44 rather than 16, 24, 40)
typography: rounded sans or humanist serif, variable weight
motion: slower than the default set. The ambient ease token for system motion; the standard
        spring (no bounce) for gestures. Nothing snappy, no overshoot.
```

## Component Rules

- Text lives in a rectangular safe area inset inside the blob. The silhouette is irregular; the text block isn't, and the curve clips nothing.
- Background shapes sit behind content at low contrast, without hard edges.
- Shapes drift or morph over seconds. Ambient movement is limited to decorative layers, never containers holding text.

## Accessibility

- The muted palette fails contrast easily. White on sage is 2.5:1, on terracotta 3.6:1. Use the dark text token on light fills and check text against both gradient stops.
- Clip-paths clip focus rings and can cut text at large sizes. Put focus on an unclipped inner element.
- Irregular shapes keep regular hit targets, and the tappable area matches what looks tappable.
- Asymmetry is visual only; source order stays linear.
- Ambient motion and smooth scrolling are off under Reduce Motion.

## Platform Implementation

Signature technique: displacement and noise, so forms look grown and move like liquid. On web that is SVG `feTurbulence` with `feDisplacementMap` on images, and morphing blob clip-paths.

**iOS / SwiftUI**
```swift
struct Blob: Shape {
    var phase: Double

    var animatableData: Double {
        get { phase }
        set { phase = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let base = min(rect.width, rect.height) / 2
        let steps = 120
        var path = Path()
        for step in 0...steps {
            let angle = Double(step) / Double(steps) * 2 * .pi
            let wobble = 1 + 0.12 * sin(3 * angle + phase) + 0.06 * sin(5 * angle - phase)
            let radius = base * 0.85 * wobble
            let point = CGPoint(x: center.x + radius * cos(angle), y: center.y + radius * sin(angle))
            if step == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }
}

struct BlobCard<Content: View>: View {
    var phase: Double
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(Spacing.s8)
            .background(Color.Semantic.Background.secondary.gradient, in: Blob(phase: phase))
            .contentShape(Blob(phase: phase))
    }
}
```
Animate `phase` slowly with the ambient token, gated on Reduce Motion. `Capsule()` for controls.

**Android / Compose**
```kotlin
val shape = GenericShape { size, _ ->
    val blob = RoundedPolygon(
        numVertices = 7,
        radius = size.minDimension / 2,
        centerX = size.width / 2,
        centerY = size.height / 2,
        perVertexRounding = blobRounding      // a different CornerRounding per vertex
    )
    addPath(blob.toPath().asComposePath())
}
Box(Modifier.clip(shape).background(Brush.linearGradient(gradientForest)).padding(blobInset))
```
`RoundedPolygon` and `Morph` come from `androidx.graphics:graphics-shapes`; `Morph` between two polygons gives the slow shape change. `CircleShape` for pills. Dynamic color off.

**Web**
```css
.organic-card {
  border-radius: var(--radius-blob-a);
  padding: var(--spacing-blob-inset);
  transition: border-radius var(--duration-cinematic) var(--ease-sine-in-out);
}
.organic-card:hover { border-radius: var(--radius-blob-b); }
.blob-layer {
  clip-path: shape(from 50% 0%, curve to 100% 45% with 85% 5%, curve to 55% 100% with 105% 90%,
                   curve to 0% 55% with 10% 105%, curve to 50% 0% with -5% 10%, close);
}
.btn-organic { border-radius: 100vmax; }
@media (prefers-reduced-motion: reduce) { .organic-card { transition: none; } }
```
`shape()` clip-paths are percentage-based and transition between states with matching commands. For morphing between unrelated outlines use GSAP MorphSVG (see `motion-design`).
