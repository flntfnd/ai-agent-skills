# Brutalism (Pure)

Stripped to structure. No decorative layer. The raw-HTML aesthetic held to current performance and accessibility standards. Hierarchy comes from scale, weight, and spacing alone. Confrontational and honest.

**When to use**: Developer tools, technical documentation, portfolios, niche platforms whose audience reads a raw aesthetic as credibility. Not for mainstream consumer products.

**Not to be confused with**: Neo-Brutalism (fills, hard offset shadows, press-collapse), Editorial / Structural (serif, refined, multi-column), Retro Computing (period costume with screen effects; Pure imitates no era).

## Visual Signature

Identifiable at a glance by: extreme type-scale contrast (display at 6-8rem beside body at 1rem), full-width solid rules as the only dividers, monospace or raw grotesque type, no shadows, no radius, no color beyond ink, paper, and at most one stark accent. It looks like a well-built HTML document and feels slightly confrontational.

**Structural requirements:**
- Navigation: plain text links in document flow. No background, no padding box.
- Hero: display type at `clamp(3rem, 10vw, 8rem)`, regular weight, full column, no background, a rule below.
- Content lists: a real table, or items separated by a rule. No cards, no row backgrounds.
- Sections: separated only by a rule (1-2px, solid ink, never grey) and generous margin.
- Links and CTAs: underlined text, or a bordered rectangle with no fill at rest. Hover, press, and focus invert ink and paper.
- Type scale: display and body do the work, with one intermediate heading size at most.

**Wrong if:** anything has a shadow or a radius, colors beyond ink/paper/one accent appear, rules are grey hairlines, the type scale steps evenly instead of jumping, any container has a resting fill, or anything animates beyond the inversion.

## Token Modifications

```
color/semantic/background/primary → paper (#FFFFFF or #F0EDE8)
color/semantic/text/primary       → ink (#000000)
color/semantic/border/default     → ink
color/semantic/interactive/primary → ink, or one saturated accent (must pass 4.5:1 on paper)
dark mode: ink and paper swap, nothing else

radius: 0     shadow: none     size/rule: 1-2px, solid
spacing: large and deliberately uneven (generous above a section, tight under its heading)
typography: one family, monospace or grotesque
  display clamp(3rem, 10vw, 8rem), line-height 1
  body 1rem, line-height 1.6, measure 65ch
motion: none. The inversion is instant.
```

## Component Rules

- No cards, no illustrations, no icons except where the icon is the function.
- Tables are the primary data layout.
- The inversion (ink background, paper text) is the only fill in the system and exists only while hovered, pressed, focused, or selected.
- Platform form controls are kept and minimally restyled (font, border, zero radius). The unstyled look is the point. This is the one style where I restyle the platform control instead of replacing it.

## Accessibility

- Links stay underlined: color isn't available as a cue.
- Selected and current-page states need a non-color cue beyond inversion (marker glyph, underline weight).
- Never remove focus outlines for purity; pair the inversion with a 2px ink outline.
- The visual language is the document outline, so headings, landmarks, and table markup must be real.
- Display type must wrap and reflow at 200% zoom and 320px width.

## Platform Implementation

Signature technique: none, intentionally. Document flow and typography; any effect breaks the style.

**iOS / SwiftUI**
```swift
struct InvertButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let ink = Color.Semantic.Text.primary
        let paper = Color.Semantic.Background.primary

        configuration.label
            .fontDesign(.monospaced)
            .padding(Spacing.s3)
            .foregroundStyle(configuration.isPressed ? paper : ink)
            .background(configuration.isPressed ? ink : Color.clear)
            .border(ink, width: Size.rule)
    }
}
```
Keep system navigation, haptics, and gestures: brutalism is visual, not behavioral.

**Android / Compose**
```kotlin
val pressed by interaction.collectIsPressedAsState()
val ink = MaterialTheme.colorScheme.onSurface
val paper = MaterialTheme.colorScheme.surface

Text(
    text = label,
    color = if (pressed) paper else ink,
    fontFamily = FontFamily.Monospace,
    modifier = Modifier
        .background(if (pressed) ink else Color.Transparent)
        .border(ruleWidth, ink, RectangleShape)
        .clickable(interactionSource = interaction, indication = null, onClick = onClick)
        .padding(padding)
)
```
`RectangleShape` everywhere, zero tonal and shadow elevation, dynamic color off.

**Web**
```css
h1 { font-size: clamp(3rem, 10vw, 8rem); line-height: 1; font-weight: 400; }
hr { border: 0; border-top: var(--size-rule) solid var(--color-semantic-border-default); }
a  { color: inherit; text-decoration: underline; }
button { font: inherit; background: none; color: inherit; border: var(--size-rule) solid; border-radius: 0; }
a:hover, button:hover, :focus-visible {
  background: var(--color-semantic-text-primary);
  color: var(--color-semantic-background-primary);
}
:focus-visible { outline: 2px solid var(--color-semantic-text-primary); outline-offset: 3px; }
```
