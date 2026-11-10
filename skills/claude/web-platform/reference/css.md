All CSS is custom. I don't use Tailwind or any framework, and no preprocessor unless the project already has one. Support status for every feature is in `browser-compatibility.md`. Sections marked **Newer** aren't widely available yet, so that file's policy applies.

Who owns what:

- **Token names** come from `figma-design-system/reference/token-architecture.md`. It's the Figma path with slashes turned into hyphens: `color/semantic/text/primary` is `--color-semantic-text-primary`. Names in code and in the design file match exactly.
- **Color values** come from `color-system` (`reference/palette.md`, `reference/implementation.md`).
- **Motion tokens and CSS motion technique** come from `motion-design` (`reference/cross-platform-tokens.md`, `reference/web-css-transitions.md`). Samples here use its names (`--duration-fast`, `--ease-enter`) and never define values.

## Contents

- [Layers and Tokens](#layers-and-tokens)
- [Color](#color)
- [@scope](#scope)
- [Container and Style Queries](#container-and-style-queries)
- [:has()](#has)
- [Fluid Type and Viewport Units](#fluid-type-and-viewport-units)
- [Anchor Positioning](#anchor-positioning)
- [Motion Rules](#motion-rules)
- [CSS Instead of JavaScript](#css-instead-of-javascript)
- [Performance](#performance)

## Layers and Tokens

```css
@layer reset, base, tokens, components, utilities, overrides;
```

Each layer beats the ones before it regardless of specificity. `!important` is never needed to win a specificity fight. Unlayered styles beat every layer, so import third-party CSS into one: `@import url("vendor.css") layer(reset);`.

All tokens live in one `:root` block. Primitives hold raw values. Semantic tokens alias primitives, and components use the semantic ones. `light-dark()` keeps both color schemes in that one block. No second block inside a media query.

```css
@layer tokens {
    :root {
        color-scheme: light dark;

        --color-primitive-gray-50: oklch(98% 0 0);
        --color-primitive-gray-900: oklch(15% 0 0);
        --color-primitive-blue-300: oklch(78% 0.12 260);
        --color-primitive-blue-500: oklch(60% 0.2 260);
        --spacing-2: 0.5rem;
        --spacing-4: 1rem;
        --radius-md: 0.5rem;

        --color-semantic-background-primary: light-dark(var(--color-primitive-gray-50), var(--color-primitive-gray-900));
        --color-semantic-text-primary: light-dark(var(--color-primitive-gray-900), var(--color-primitive-gray-50));
        --color-semantic-interactive-primary: light-dark(var(--color-primitive-blue-500), var(--color-primitive-blue-300));
    }

    /* Manual theme switch: flip the scheme, not the tokens */
    :root[data-theme="light"] { color-scheme: light; }
    :root[data-theme="dark"] { color-scheme: dark; }
}

@layer components {
    .button {
        background: var(--color-semantic-interactive-primary);
        padding: var(--spacing-2) var(--spacing-4);
        border-radius: var(--radius-md);
    }
}
```

Those values show the shape. Real ones come from the design file and `color-system`. A component rule never contains a raw color, length, radius, shadow, duration or easing.

Nesting is native. Keep it to two levels. Deeper nesting rebuilds the specificity problems layers exist to end.

## Color

`oklch(lightness chroma hue)`. Equal lightness steps look equal, and changing lightness doesn't drift the hue. HSL can't promise either. Derive variants, don't hand-pick them:

```css
:root {
    --color-semantic-interactive-primary-hover:
        oklch(from var(--color-semantic-interactive-primary) calc(l - 0.08) c h);
    --color-semantic-interactive-primary-subtle:
        color-mix(in oklch, var(--color-semantic-interactive-primary) 20%, transparent);
}
```

`contrast-color()` (**Newer**) only picks black or white. Anything beyond that is `color-system`'s job, along with palette generation, contrast math and gamut clamping.

## @scope

**Newer.** Scopes a component's rules to its subtree, with an optional lower boundary so they stop at nested components. It replaces BEM naming and CSS-in-JS scoping.

```css
@scope (.card) to (.card-slot) {
    :scope { padding: var(--spacing-4); }
    img { border-radius: var(--radius-md); }
}
```

`img` matches images in `.card`, but not inside a `.card-slot` within it.

## Container and Style Queries

Media queries are for page layout and user preferences. Component layout uses container queries, because a component doesn't know how wide its slot is.

```css
.card-wrapper { container: card / inline-size; }

.card {
    display: grid;

    @container card (inline-size >= 25rem) {
        grid-template-columns: 12rem 1fr;
    }
}
```

**Newer: style queries.** A parent sets a custom property once and descendants respond. No modifier class on each child. Only custom properties can be queried.

```css
.card-wrapper { --variant: compact; }

@container style(--variant: compact) {
    .card-meta { display: none; }
}
```

When cards in a row have to align their internal rows, use `grid-template-rows: subgrid`. Don't equalize heights in JS.

## :has()

```css
.field:has(input:user-invalid) { color: var(--color-semantic-status-error); }

/* Lock page scroll while a modal dialog is open */
html:has(dialog:modal) { overflow: hidden; }
```

Use `:user-invalid`, not `:invalid`. It only matches after the user has interacted, so an empty required field isn't red on load.

## Fluid Type and Viewport Units

```css
:root {
    --typography-size-title-lg: clamp(1.75rem, 1.3rem + 2.5vw, 3rem);
}
```

The preferred value always includes a `rem` term. A size in `vw` alone ignores zoom and the user's font-size setting, and fails WCAG 1.4.4. Same reason font sizes are never plain `px`.

`100vh` is the largest viewport on mobile. It overflows whenever browser chrome is visible. Use `100dvh` for full-height sections, `svh` for content that can't be cut off, `lvh` only for decorative backgrounds.

## Anchor Positioning

**Newer.** The native replacement for JS positioning libraries in tooltips, menus and popovers.

```css
.trigger { anchor-name: --trigger; }

.menu {
    position: absolute;
    position-anchor: --trigger;
    position-area: block-end span-inline-end;
    margin-block-start: var(--spacing-2);
    position-try-fallbacks: flip-block, flip-inline;
}
```

`position-area` places the element on a 3x3 grid around the anchor. `position-try-fallbacks` flips it when it would overflow. Name the anchor explicitly, even for a popover and its invoker. Implicit anchoring isn't consistent across engines. Keep a plain positioned fallback outside `@supports (position-area: block-end)`. The pattern is in `browser-compatibility.md`.

## Motion Rules

Technique and tokens are in `motion-design/reference/web-css-transitions.md`: entry and exit with `@starting-style`, intrinsic-size animation, scroll-driven animations, view transitions. Don't write a second version here. The web rules on top of it:

- Motion is opt-in. Write it inside `@media (prefers-reduced-motion: no-preference)`, so the default state is the finished, readable one.
- The un-animated state is always complete. An element that starts at `opacity: 0` and needs an animation to appear is invisible where the feature is missing.
- Keep scroll-driven animations inside `@supports (animation-timeline: view())` until `browser-compatibility.md` lists them as widely available.
- Where a browser can't transition `display`, exit animations built on `allow-discrete` are skipped. That's acceptable. Don't add JS to paper over it.
- A disclosure animates height with `grid-template-rows: 0fr` to `1fr`. `interpolate-size` replaces that only once it's in every browser.
- Scroll-driven animations scrub with the scroll position. For an animation that plays once when an element enters the viewport, IntersectionObserver plus a class is still the cross-browser tool.
- Each `view-transition-name` is unique at the moment of the snapshot. In React use `<ViewTransition>` (`nextjs.md`), not `document.startViewTransition`. Cross-document transitions fall back to a normal navigation where unsupported.

## CSS Instead of JavaScript

- `text-wrap: balance` on headings, `text-wrap: pretty` on body copy.
- `field-sizing: content` grows a `<textarea>` with its content. **Newer.**
- `sibling-index()` for staggered delays without inline styles. **Newer.**
- `scrollbar-gutter: stable` stops the shift when a scrollbar appears.
- `scroll-padding-block-start` on the scroller keeps anchored and focused content clear of a sticky header.
- `@property` gives a custom property a type, which makes it animatable (gradient angles, numeric counters).

## Performance

Animate `transform` (or `translate`, `scale`, `rotate`) and `opacity`. They composite without layout or paint. `width`, `height`, `top`, `left`, `margin` and `padding` run layout every frame.

```css
.card {
    transition: translate var(--duration-fast) var(--ease-enter);

    @media (hover: hover) {
        &:hover { translate: 0 calc(-1 * var(--motion-distance-sm)); }
    }
}
```

One exception: the disclosure above. Its content has to push other content down, and it's small, user-triggered and short.

- `will-change` only on an element about to animate, removed afterwards. Left on, it pins a layer in memory.
- `content-visibility: auto` with `contain-intrinsic-size` skips rendering for long off-screen sections.
- `filter`, `backdrop-filter` and `mix-blend-mode` are cheap to write and expensive to paint over large areas. Test on a mid-range phone.
