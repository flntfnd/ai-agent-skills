# Bento Grid

Modular tile layout. Content sits in a grid of variably-sized rounded cells, some spanning columns or rows. The grid is the design, not just a layout tool. Everyone ships bento now. What separates a deliberate one from a generic one is whether tile size means something.

**When to use**: Dashboards, home screens, feature overviews; wherever varied content types coexist at one visual level. Strong on iPad and large screens.

**Not to be confused with**: a card grid (equal tiles), masonry (variable heights, no row alignment), or a page that merely contains cards.

## Visual Signature

Identifiable at a glance by: all content in variably-sized rounded tiles, no linear section flow, one or two large tiles dominating, the page background showing between tiles as even gutters. Size communicates hierarchy.

**Structural requirements:**
- An explicit grid with defined tracks. ALL content lives inside tiles.
- At least three tile sizes (large 2x2, medium 2x1 or 1x2, small 1x1), all snapping to the same tracks, with a clean rectangular outer edge.
- Radius: one family. 20-24px on standard tiles, up to 32px on the featured tile.
- Gap: one value everywhere, 12-20px.
- Featured tile: the largest cell takes the brand or accent color and the highest-priority content. One, two at most.
- One concept per tile: a metric, a visual, or an action, never a mix.

**Wrong if:** tiles are all one size, content flows outside the grid, radius or gap varies between tiles, tile size doesn't track importance, or the outer edge is ragged.

## Token Modifications

```
radius:  tile 20-24px, featured 28-32px (one family)
spacing: grid-gap 12-20px (one value per breakpoint), cell padding 24-32px
color/semantic/background/secondary → standard cell
color/semantic/background/elevated  → muted cell
color/semantic/interactive/primary  → featured cell fill (1-2 cells)
motion: tile press and lift use the snappy spring token; tile-to-detail is a shared-element transition
```

## Component Rules

- Spans: 1x1, 2x1, 1x2, 2x2, 3x1.
- **Limit visible cells.** 6-9 is comfortable; past 12-15 the organizing benefit is gone. Paginate or cut rather than cram.
- Tile content adapts to the tile's own size, not the viewport.
- Only interactive tiles react to hover or press.
- **Responsive**: decide which cells keep prominence at each breakpoint (the featured tile stays full-width and taller). Don't let the grid decay into identical stacked blocks.

## Accessibility

- **Source order is reading order.** Grid placement can disconnect visual order from DOM order, and assistive tech and keyboard focus follow the DOM. Write markup in priority order and place cells visually; never reorder for looks if it inverts the sequence.
- A fully clickable tile is one link or button with one accessible name, not nested interactive elements.
- Each tile is a semantic unit with a real heading.
- Text on the featured tile passes 4.5:1 against the brand fill.

## Platform Implementation

Signature technique: grid precision, plus a shared-element transition from tile to detail.

**iOS / SwiftUI**
```swift
struct BentoBoard: View {
    @Namespace private var zoom

    var body: some View {
        NavigationStack {
            Grid(horizontalSpacing: Spacing.s5, verticalSpacing: Spacing.s5) {
                GridRow {
                    NavigationLink(value: "featured") {
                        BentoTile(title: "Featured")
                    }
                    .matchedTransitionSource(id: "featured", in: zoom)
                    .gridCellColumns(2)
                }
                GridRow {
                    BentoTile(title: "A")
                    BentoTile(title: "B")
                }
            }
            .navigationDestination(for: String.self) { id in
                BentoDetail(id: id)
                    .navigationTransition(.zoom(sourceID: id, in: zoom))
            }
        }
    }
}
```
`Grid` spans columns only. A row span (a 2x2 tile beside two stacked 1x1 tiles) is composition or a custom `Layout`. `LazyVGrid` can't span at all.

**Android / Compose**
```kotlin
LazyVerticalGrid(
    columns = GridCells.Fixed(columns),
    horizontalArrangement = Arrangement.spacedBy(gridGap),
    verticalArrangement = Arrangement.spacedBy(gridGap)
) {
    item(span = { GridItemSpan(maxLineSpan) }) { BentoTile(featured = true) }
    item(span = { GridItemSpan(2) }) { BentoTile() }
    item { BentoTile() }
}
```
`LazyVerticalGrid` spans columns only; row spans need a custom `Layout`. Pick the column count from the window size class. Tile-to-detail uses `SharedTransitionLayout`.

**Web**
```css
.bento {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(10rem, auto);
  gap: var(--grid-gap);
}
.tile { border-radius: var(--radius-tile); padding: var(--cell-pad); }
.tile--featured { grid-column: span 2; grid-row: span 2; border-radius: var(--radius-tile-featured); }
.tile--wide { grid-column: span 2; }
.tile--tall { grid-row: span 2; }

@container (max-width: 48rem) {
  .bento > .tile { grid-column: span 2; }
  .bento > .tile--featured { grid-column: 1 / -1; }
}
@container (max-width: 30rem) {
  .bento > .tile { grid-column: 1 / -1; grid-row: auto; }
}
```
Subgrid aligns label, value, and footnote rows across neighboring tiles. Expand and collapse use same-document View Transitions with a `view-transition-name` per tile.
