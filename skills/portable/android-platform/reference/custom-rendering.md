# Custom Rendering

This is what separates native Android apps that feel hand-crafted from generic Compose output. Use these APIs when standard composables can't get the visual result. Custom drawing still takes colors from the theme and sizes from tokens. The only raw numbers below are shader math.

## Contents
- [Choosing the Tool](#choosing-the-tool)
- [Compose Canvas](#compose-canvas)
- [Mesh Gradients and Wide Color](#mesh-gradients-and-wide-color)
- [AGSL Shaders](#agsl-shaders)
- [RenderEffect and Blur](#rendereffect-and-blur)
- [Rich Text](#rich-text)

## Choosing the Tool

| Need | Use | Min API |
| --- | --- | --- |
| Shapes, paths, charts, waveforms | `Canvas` / `drawBehind` / `drawWithCache` | any |
| Multi-point organic color field | `MeshGradientPainter` (Compose 1.12+) | test on minSdk |
| Blur, saturation, color matrix on a composable | `Modifier.blur`, `graphicsLayer { renderEffect }` | 31 |
| Per-pixel procedural effect (grain, distortion, glow) | AGSL `RuntimeShader` | 33 |

Every effect with a minimum API needs a designed fallback on older devices: a tonal surface in place of blur, a static gradient in place of a shader. Not a crash. Not an empty box.

## Compose Canvas

- Build `Path`, `Brush`, and `Stroke` in `drawWithCache`, not in the draw lambda. The draw lambda runs every frame during animation.
- Read animated state inside the draw lambda. A change then invalidates drawing only and skips recomposition and layout.
- `MaterialTheme.colorScheme` isn't readable inside `DrawScope`. Resolve colors in composition and capture them.

```kotlin
@Composable
fun Waveform(samples: List<Float>, modifier: Modifier = Modifier) {
    val start = MaterialTheme.colorScheme.primary
    val end = MaterialTheme.colorScheme.tertiary

    Spacer(
        modifier
            .fillMaxWidth()
            .height(WaveformTokens.height)
            .drawWithCache {
                val midY = size.height / 2f
                val path = Path().apply {
                    samples.forEachIndexed { i, sample ->
                        val x = size.width * i / samples.lastIndex.coerceAtLeast(1)
                        val y = midY - sample * midY * WaveformTokens.amplitude
                        if (i == 0) moveTo(x, y) else lineTo(x, y)
                    }
                }
                val brush = Brush.horizontalGradient(listOf(start, end))
                val stroke = Stroke(width = WaveformTokens.strokeWidth.toPx(), cap = StrokeCap.Round)
                onDrawBehind { drawPath(path, brush, style = stroke) }
            }
    )
}
```

For a continuously animated shape, keep one `Path` in `remember`, `rewind()` it each frame, and drive it from `rememberInfiniteTransition`. A linear phase is correct for an ambient loop. It isn't a UI transition. Skip ambient loops when animations are turned off.

## Mesh Gradients and Wide Color

`MeshGradientPainter` renders a mesh gradient: a grid of vertices, each with a position (0..1 on both axes) and a color, blended smoothly. Use it for an organic multi-color field. Don't stack radial gradients.

```kotlin
@Composable
fun AmbientBackground(modifier: Modifier = Modifier) {
    val scheme = MaterialTheme.colorScheme
    val painter = remember(scheme) {
        MeshGradientPainter(rows = 1, columns = 1, hasBicubicColor = true) {
            setVertex(0, 0, Offset(0f, 0f), scheme.primaryContainer)
            setVertex(0, 1, Offset(1f, 0f), scheme.tertiaryContainer)
            setVertex(1, 0, Offset(0f, 1f), scheme.secondaryContainer)
            setVertex(1, 1, Offset(1f, 1f), scheme.surfaceContainer)
        }
    }
    Box(modifier.fillMaxSize().paint(painter))
}
```

A mesh of `rows` × `columns` cells has `(rows + 1)` × `(columns + 1)` vertices. `Modifier.meshGradient` existed only in pre-release builds and is gone. The painter is hardware-accelerated, and its behavior on older API levels isn't documented. Test it on the project's minSdk and keep a plain gradient as the fallback.

Wide color: Compose preserves non-sRGB color spaces set on a paint or shader on API 29 and up, and falls back to sRGB below. Declare the space on the color: `Color(red, green, blue, colorSpace = ColorSpaces.DisplayP3)`.

## AGSL Shaders

API 33 and up. A shader attached through `RenderEffect` receives the composable's rendered content as an input shader.

```kotlin
private const val ChromaticAberrationSrc = """
    uniform shader content;
    uniform float intensity;

    half4 main(float2 coord) {
        half4 r = content.eval(coord + float2(intensity, 0.0));
        half4 g = content.eval(coord);
        half4 b = content.eval(coord - float2(intensity, 0.0));
        return half4(r.r, g.g, b.b, g.a);
    }
"""

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
@Composable
fun ChromaticAberration(
    intensityPx: Float,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val shader = remember { RuntimeShader(ChromaticAberrationSrc) }

    Box(
        modifier.graphicsLayer {
            shader.setFloatUniform("intensity", intensityPx)
            renderEffect = RenderEffect
                .createRuntimeShaderEffect(shader, "content")
                .asComposeRenderEffect()
        }
    ) {
        content()
    }
}

// Call site gates on API level and supplies the fallback
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    ChromaticAberration(intensityPx = aberration) { Artwork() }
} else {
    Artwork()
}
```

- AGSL coordinates are pixels. Pass sizes as uniforms and convert `dp` with the density first.
- Create the `RuntimeShader` once. Setting uniforms inside `graphicsLayer { }` re-renders the layer without recomposition.
- To paint with a shader, not filter content, wrap it in `ShaderBrush(shader)`.
- Film grain is the same pattern with `resolution`, `time`, and `intensity` uniforms and a hash-noise function added to `content.eval(coord)`.
- A full-screen shader animating every frame costs battery. Run it only while visible, and never when animations are disabled.

## RenderEffect and Blur

API 31 and up. On older versions `Modifier.blur` does nothing, so the unblurred state has to look intentional.

```kotlin
// Blur a composable's content
Modifier.blur(BlurTokens.backdrop)

// Same at the graphics layer, when the radius animates
Modifier.graphicsLayer {
    renderEffect = BlurEffect(radiusPx, radiusPx, TileMode.Clamp)
}

// Chain platform effects: blur, then boost saturation
@RequiresApi(Build.VERSION_CODES.S)
fun blurAndSaturate(radiusPx: Float, saturation: Float): androidx.compose.ui.graphics.RenderEffect =
    android.graphics.RenderEffect.createChainEffect(
        android.graphics.RenderEffect.createColorFilterEffect(
            ColorMatrixColorFilter(ColorMatrix().apply { setSaturation(saturation) })
        ),
        android.graphics.RenderEffect.createBlurEffect(radiusPx, radiusPx, Shader.TileMode.CLAMP)
    ).asComposeRenderEffect()
```

- Compose's `BlurEffect` is already a Compose `RenderEffect`. Only `android.graphics.RenderEffect` needs `asComposeRenderEffect()`.
- `createChainEffect(outer, inner)` applies `inner` first. `ColorMatrix` and `ColorMatrixColorFilter` above are the `android.graphics` classes.
- These blur the layer they're applied to, including everything inside it. They don't blur what's behind it. For a frosted panel, draw the background content in its own blurred layer and the panel's sharp content over it as a sibling. `blur` on the panel itself blurs the panel's text.

## Rich Text

Start spans from theme styles so mixed text follows the type scale and font scaling.

```kotlin
val type = MaterialTheme.typography
val colors = MaterialTheme.colorScheme

val headline = remember(type, colors) {
    buildAnnotatedString {
        withStyle(type.displayMedium.toSpanStyle().copy(fontWeight = FontWeight.Medium)) {
            append("Design")
        }
        withStyle(
            type.displayMedium.toSpanStyle().copy(
                fontFamily = FontFamily.Serif,
                color = colors.onSurfaceVariant
            )
        ) {
            append(" system.")
        }
    }
}

// Paragraph-level styling
withStyle(ParagraphStyle(lineHeight = 1.6.em, textIndent = TextIndent(firstLine = 1.em))) {
    append(articleBody)
}

// Inline links: themed, with built-in click handling
withLink(
    LinkAnnotation.Url(
        url = termsUrl,
        styles = TextLinkStyles(SpanStyle(color = colors.primary, textDecoration = TextDecoration.Underline))
    )
) {
    append("terms of service")
}
```

`ClickableText` and string-tag click handling are deprecated. Use `withLink`.

**Editable rich text.** The state-based `BasicTextField(state = ...)` supports formatting on editable text. Apply styles inside an edit block. They're tracked as the text changes.

```kotlin
val state = rememberTextFieldState()

state.edit {
    addStyle(SpanStyle(fontWeight = FontWeight.Bold), selection.min, selection.max)
}
```

Query formatting with `getSpanStyles(range)` and `getParagraphStyles(range)`. Both take a `TextRange`. `TextFieldState` saves and restores styles with the rest of its state. Use this for rich-text input, not a markup layer over a plain field.
