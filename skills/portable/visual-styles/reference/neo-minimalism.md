# Neo-Minimalism

Minimalism with warmth. Not the cold white-on-white of 2018: warm neutrals, a serif voice, organic spacing instead of a rigid 8pt grid. The interface feels considered, not empty.

**When to use**: Productivity, lifestyle, health, finance; anything that needs clarity without feeling clinical.

**Not to be confused with**: Calm / Anti-Distraction (suppresses brand and chrome for long sessions; this is still an expressive branded surface), Editorial / Structural (dense, multi-column, rule-heavy; this is sparse and single-flow), Texture / Tactile (grain is the identifier there; here it's optional and never noticed first).

## Visual Signature

Identifiable at a glance by: large areas of warm off-white, serif display type at light weight, no boxed containers, content separated by space or a single hairline. Navigation is text against the page, with no bar.

**Structural requirements:**
- Navigation: text-only, no background fill, no border.
- Hero: oversized serif display at Light (300), generous vertical padding, subtext in regular-weight sans.
- Lists: items separated by one warm-tinted hairline or by space only. No row borders, no card backgrounds.
- Sections: divided by whitespace, plus a hairline if needed. Never by background color blocks or cards.
- CTAs: text links or hairline-outlined buttons. One filled button per screen at most.
- Color: a warm neutral ramp plus one accent.

**Wrong if:** any container has a visible border or box, shadows appear anywhere, spacing feels tight, typography is all sans-serif, the background is pure white or cool grey, or grain is noticed before the type.

## Token Modifications

```
color/primitive/neutral -- warm-tinted, not pure gray
  100 #FAF9F7   200 #F5F3EE   300 #E8E4DC
  500 #B5AFA4 (decorative only, 2.1:1 on 100)
  700 #6B6560 (5.5:1 on 100)   900 #2A2622

color/semantic/background/primary   → neutral/100
color/semantic/background/secondary → neutral/200
color/semantic/text/primary         → neutral/900
color/semantic/text/secondary       → neutral/700
color/semantic/border/default       → neutral/900 at 12% (hairline)

radius:  sm 6, md 10, lg 18, xl 28
spacing: base scale expanded 25% (base 20, lg 28, xl 40)

typography/family/heading → serif (Canela, Tiempos, Newsreader, or platform serif)
typography/weight/display → Light (300), at 32px and above only
typography/weight/body    → Regular (400)

motion: ease tokens only (standard, ambient). No spring tokens, nothing snappy.
```

## Component Rules

- Hairlines are one device pixel on native, 1px on web. Never a full border.
- Where a surface must separate, use the `background/secondary` tint, not an outline or shadow.
- Icons are line-weight, not filled.
- Light weight is for display sizes only; below 32px a light serif loses its thin strokes.
- Grain is optional and capped at 2-3% over large fields. If it reads as texture, the style has become Texture / Tactile.

## Accessibility

- The 12% hairline is decoration. Inputs and any control whose edge is its only affordance take `text/secondary` for the outline (3:1 or better).
- With no fills or shadows to carry state, focus and selection need an explicit outline or underline.
- Text links are underlined: the palette is near-monochrome.

## Platform Implementation

Signature technique: restraint. No GPU effect identifies this style, and adding one usually breaks it.

**iOS / SwiftUI**
```swift
struct Hairline: View {
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        Rectangle()
            .fill(Color.Semantic.Border.default)
            .frame(height: 1 / displayScale)
    }
}

struct DisplayTitle: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(.largeTitle, design: .serif, weight: .light))
            .foregroundStyle(Color.Semantic.Text.primary)
    }
}
```
Warm neutrals are asset-catalog colors, not system grays. In a `List`, hide row separators and space rows with the spacing tokens.

**Android / Compose**
```kotlin
Text(
    text = title,
    style = MaterialTheme.typography.displayMedium.copy(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Light
    )
)
HorizontalDivider(thickness = Dp.Hairline, color = MaterialTheme.colorScheme.outlineVariant)
```
Map the warm ramp onto a custom `ColorScheme` and turn dynamic color off: wallpaper-derived tones break the palette.

**Web**
```css
h1 { font-family: var(--font-heading); font-weight: 300; text-wrap: balance; }
.list > * + * { border-top: 1px solid var(--color-semantic-border-default); }
nav { background: none; border: 0; }
```
Page changes are slow cross-fades through same-document View Transitions with the ease tokens.
