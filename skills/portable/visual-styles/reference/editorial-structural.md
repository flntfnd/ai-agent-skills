# Editorial / Structural

The grid as a foreground element. Typography leads. Print craft on screen: newspapers, magazines, annual reports. Serif headlines, visible structure, and dense information made readable through rigorous hierarchy.

**When to use**: News and long-form publishing, financial reporting, research tools, professional services, brand storytelling. Signals: sophisticated, trustworthy, precise.

**Not to be confused with**: Neo-Minimalism (sparse, single-flow, almost no rules), Brutalism (Pure) (blunt mono or grotesque with a two-size scale; this is refined, serif, with many graded sizes), Kinetic Typography (the type moves; here it's essentially static).

## Visual Signature

Identifiable at a glance by: an explicit column grid that's visible and respected, serif headlines over dense body text, hairline rules as structure, and the density of a newspaper spread. Many type sizes coexist without chaos because the hierarchy is rigorous.

**Structural requirements:**
- Layout: an explicit grid (12 columns on desktop), at least two content columns of unequal width on wide screens (a lead and a rail), everything aligned to shared column edges.
- Typography: serif display (Canela, Libre Caslon, Playfair, Newsreader, or the platform serif). Body 16-18px at 1.6-1.8 line height. At least four type roles visible at once: headline, deck, body, label or caption.
- Rules: hairlines between sections and groups, vertical hairlines between columns. A heavier 2-3px rule may top a major section.
- No cards: content sits in columns, separated by rules and whitespace.
- Section labels: small caps or uppercase, tracked 0.08-0.15em, 11-12px.
- Imagery: rectangular, column-aligned, always captioned.

**Wrong if:** type is all one size or all sans-serif, layout is one centered column with no grid logic, sections are separated by color blocks or cards, the design lacks density, or corners exceed 4px.

## Token Modifications

```
color/semantic/text/primary       → ink, near-black (#1A1A1A)
color/semantic/background/primary → paper, warm off-white (#FAF8F5)
color/semantic/border/default     → #E8E4DC (1.2:1: structural rules only, never a control boundary)
color/semantic/interactive/primary → one strong accent, used sparingly

typography:
  display  large serif, light or regular
  headline bold serif or condensed grotesque
  body     regular serif or comfortable sans, 16-18sp, leading 1.6-1.8
  label    caps-spaced sans, 11-12sp, tracking 0.08-0.15em
  numerals tabular lining figures in tables and lists
radius: 0, or 2-4px at most
motion: minimal. Line-level reveals and wipes with the enter ease token.
```

## Component Rules

- Nothing is purely decorative. A rule, label, drop cap, or pull quote each organizes or carries content.
- Numbers get tabular figures so they align.
- Captions are caption size, directly under the image.
- Body measure stays within 45-75 characters per column, even when the grid offers more.
- Text reveals are line by line. Character-level animation belongs to Kinetic Typography.

## Accessibility

- Density is the risk: body stays at 16px or more, and columns collapse to one reading column on narrow screens in source order (lead first, rail after).
- 11-12px labels are the floor, must pass 4.5:1, and scale with user text settings. Uppercase is applied by styling, not typed, so screen readers don't spell it out.
- Form fields and buttons take ink or a 3:1 color for their boundary, never the rule color.
- Links in dense text are underlined.

## Platform Implementation

Signature technique: restraint, no GPU effects. On web, `clip-path` wipes and line-level reveals tied to scroll, with the revealed state as the default.

**iOS / SwiftUI**
```swift
struct SectionHeader: View {
    let label: String
    let headline: String
    @Environment(\.displayScale) private var displayScale

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s3) {
            Rectangle()
                .fill(Color.Semantic.Border.default)
                .frame(height: 1 / displayScale)
            Text(label)
                .font(.caption.weight(.semibold))
                .textCase(.uppercase)
                .kerning(Typography.Tracking.label)
            Text(headline)
                .font(.system(.largeTitle, design: .serif))
        }
    }
}
```
`.monospacedDigit()` for figures. Columns come from `Grid` or a custom `Layout` keyed to the horizontal size class.

**Android / Compose**
```kotlin
HorizontalDivider(thickness = Dp.Hairline, color = MaterialTheme.colorScheme.outlineVariant)
Text(
    text = label.uppercase(),
    style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.08.em)
)
Text(
    text = headline,
    style = MaterialTheme.typography.displaySmall.copy(fontFamily = FontFamily.Serif)
)
Text(text = amount, style = MaterialTheme.typography.bodyLarge.copy(fontFeatureSettings = "tnum"))
```
Tracking is in `em`, not `sp`, so it scales with the font size.

**Web**
```css
.page { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: var(--gutter); }
.lead { grid-column: span 8; }
.rail {
  grid-column: span 4;
  border-inline-start: 1px solid var(--color-semantic-border-default);
  padding-inline-start: var(--gutter);
}
.rule--section { border: 0; border-top: 3px solid var(--color-semantic-text-primary); }
.label { font-size: var(--typography-size-label); letter-spacing: var(--typography-tracking-label); text-transform: uppercase; }
table { font-variant-numeric: tabular-nums lining-nums; }
@media (max-width: 767px) { .lead, .rail { grid-column: 1 / -1; border: 0; padding: 0; } }
```
