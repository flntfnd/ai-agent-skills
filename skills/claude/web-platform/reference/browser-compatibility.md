Web support status for every skill. `motion-design`, `color-system` and `visual-styles` defer to this file. The other files here say how a feature works. This one says whether it's safe to ship.

As of November 2026. Baseline status moves every month. If that date is more than a few months old, check the feature at webstatus.dev or on its MDN page before relying on its row.

## Contents

- [Support Policy](#support-policy)
- [Widely Available](#widely-available)
- [Newly Available](#newly-available)
- [Limited Availability](#limited-availability)
- [Fallback Patterns](#fallback-patterns)
- [Interop 2026](#interop-2026)
- [Testing Checklist](#testing-checklist)

## Support Policy

Baseline tracks Chrome, Edge, Firefox and Safari on desktop and mobile. A feature is **newly available** the day the last of them ships it. It's **widely available** 30 months later.

| Status | How to use it |
| --- | --- |
| Widely available | Freely. No fallback, no `@supports`, no polyfill |
| Newly available | Use it. Add a fallback only where a browser a version or two behind would lose function, not polish. A missing entry animation is fine. A menu that renders off-screen isn't |
| Limited | Progressive enhancement only. The page has to work without it |

No polyfills for anything above 95% support. The one polyfill I carry is Temporal.

## Widely Available

- **CSS:** cascade layers, container size queries and `cq*` units, nesting, `:has()`, `oklch()`/`oklab()`, `color-mix()`, subgrid, `dvh`/`svh`/`lvh`, `linear()` easing, individual `translate`/`scale`/`rotate`, `:focus-visible`, `:user-valid`/`:user-invalid`, `:modal`, `clip-path`, `mix-blend-mode`, scroll snap, `touch-action`, `env()` safe-area insets, `overscroll-behavior: contain`, `@media (hover)` and `(pointer)`, `prefers-reduced-motion`, `prefers-contrast`, `forced-colors`
- **HTML:** `<dialog>`, `inert`, `loading="lazy"`, `<search>`, import maps, AVIF and WebP
- **JS:** `structuredClone`, `Array.fromAsync`, `Object.groupBy`, `Promise.withResolvers`, `AbortSignal.timeout` and `.any`
- **APIs:** Web Animations, ResizeObserver, IntersectionObserver, Pointer Events, WebGL 2, OffscreenCanvas

## Newly Available

In every current browser. The date is when the last engine shipped. Add 30 months for widely available.

| Feature | Since | Notes |
| --- | --- | --- |
| `light-dark()`, `text-wrap: balance` | 2024-05 | Widely available from 2026-11 |
| Set methods | 2024-06 | |
| `@property` | 2024-07 | |
| `@starting-style`, `transition-behavior: allow-discrete` | 2024-08 | Firefox doesn't transition `display`, so exit animations are skipped there. Entry animations work. `overlay` is Chromium only |
| `<details name>` | 2024-09 | |
| Relative color syntax | 2024-09 | |
| Unprefixed `backdrop-filter` | 2024-09 | |
| `content-visibility` | 2024-09 | |
| `fetchpriority` | 2024-10 | |
| `scrollbar-gutter` | 2024-12 | |
| `popover` | 2025-01 | |
| Iterator helpers | 2025-03 | |
| JSON import attributes | 2025-04 | |
| `RegExp.escape` | 2025-05 | |
| Same-document view transitions, `view-transition-class` | 2025-10 | |
| Invoker commands (`command`, `commandfor`) | 2025-12 | |
| Navigation API | 2026-01 | |
| Trusted Types | 2026-02 | |
| `shape()` | 2026-02 | |
| `@scope` | 2026-03 | |
| CSP `report-to` | 2026-03 | |
| `contrast-color()` | 2026-04 | |
| Container style queries on custom properties | 2026-05 | Range syntax inside `style()` is missing in Safari |
| `field-sizing` | 2026-06 | |
| `sibling-index()`, `sibling-count()` | 2026-08 | |
| Scroll-driven animations (`animation-timeline`, `scroll()`, `view()`) | 2026-10-27 | Firefox 159 was last. Keep the `@supports` wrapper until it's widely available |

**Anchor positioning.** The working core (`anchor-name`, `anchor()`, `position-area`, `position-try-fallbacks`, `@position-try`, `anchor-size()`) is in Chrome 125+, Firefox 147+ and Safari 26+. webstatus.dev still lists the group as limited, because the newest initial value (`position-anchor: normal`) only landed in Chrome 151, Firefox 151 and Safari 27. Treat the core as newly available and keep a non-anchored position as the fallback.

**Web Vitals APIs.** `LargestContentfulPaint` and Event Timing `interactionId` are in every engine, so LCP and INP are measurable everywhere. `LayoutShift` (CLS) and Long Animation Frames are Chromium only.

## Limited Availability

"Missing" lists engines without it in a stable release.

| Feature | Missing | Until then |
| --- | --- | --- |
| Temporal | Safari | `temporal-polyfill` in browser code |
| `using` / `Symbol.dispose` | Safari | Server-only code, or `try`/`finally` |
| `Error.isError()` | Safari desktop, partial on iOS | `instanceof Error` |
| `scheduler.yield()` | Safari | Feature-detect, fall back to `setTimeout` |
| Cross-document view transitions (`@view-transition`) | Firefox | Pages navigate without the transition |
| `interpolate-size`, `calc-size()` | Firefox, Safari | Grid `0fr` to `1fr` row transition |
| Scroll-triggered animations (`animation-trigger`) | Firefox, Safari | IntersectionObserver plus a class |
| Scroll-state container queries | Firefox, Safari | IntersectionObserver |
| CSS `if()`, `@function` | Firefox, Safari | Custom properties plus style queries |
| `corner-shape` | Firefox, Safari | `clip-path` with `shape()` |
| Advanced typed `attr()` | Safari | Inline custom properties |
| `text-wrap: pretty` | Firefox | Ship it. Ignored where missing |
| `prefers-reduced-transparency` | Firefox, Safari | Ship it. Ignored where missing |
| Unprefixed `user-select` | Safari | Ship `-webkit-user-select` beside it |
| Customizable `<select>` (`appearance: base-select`) | Firefox | Falls back to the native select |
| `<dialog closedby>` | Safari | Click handler on the backdrop |
| `popover="hint"` | Safari | `popover="manual"` plus your own hover and focus handling |
| `hidden="until-found"` | Safari | Keep a visible toggle |
| `<img sizes="auto">` | Safari is partial | Explicit `sizes` |
| WebGPU | Firefox is partial (not every OS, not Android) | WebGL 2 fallback path |
| Speculation Rules | Firefox, Safari | Framework prefetching |
| `Permissions-Policy` header | Firefox, Safari | Send it anyway |

## Fallback Patterns

Working default outside `@supports`, enhancement inside:

```css
.tooltip {
    position: absolute;
    inset-block-start: 100%;
    inset-inline-start: 0;
}

@supports (position-area: block-end) {
    .tooltip {
        position-anchor: --trigger;
        position-area: block-end span-inline-end;
        inset: auto;
        position-try-fallbacks: flip-block, flip-inline;
    }
}
```

Detect the capability, never the browser:

```javascript
const yieldToMain = () =>
    globalThis.scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve, 0));
```

## Interop 2026

The engines' shared focus list for the year. These are about to get more consistent: anchor positioning, container style queries, dialogs and popovers, scroll-driven animations, view transitions, typed `attr()`, `contrast-color()`, custom highlights, `shape()`, scroll snap, the Navigation API and `zoom`, among others. Live pass rates are at wpt.fyi/interop-2026.

## Testing Checklist

- Chrome, Firefox, Edge: latest and latest-1
- Safari: latest on macOS and on a real iOS device. Every iOS browser is WebKit, and desktop emulation misses its viewport and touch behavior
- Samsung Internet
- One mid-range Android device, real or on a device cloud

Safari is usually the engine holding a feature out of Baseline. Anything in the newly available table gets one manual pass there.
