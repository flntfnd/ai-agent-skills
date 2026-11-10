## Contents

- [Mobile-First CSS](#mobile-first-css)
- [Touch Targets](#touch-targets)
- [Viewport and Safe Areas](#viewport-and-safe-areas)
- [Touch and Pointer Input](#touch-and-pointer-input)
- [Base Font Size](#base-font-size)
- [Progressive Web Apps](#progressive-web-apps)

## Mobile-First CSS

Write the smallest layout first and add to it with `@media (width >= ...)`. The base rules are then the ones the slowest devices parse.

- Breakpoints in `rem`, so they respond to the user's font size as well as the screen.
- Media queries for page layout, container queries for components (`css.md`).
- Logical properties (`margin-inline`, `padding-block`, `inset-inline-start`), so layouts hold in right-to-left languages.
- Google indexes the mobile version. Content hidden or missing on mobile is missing from search.

## Touch Targets

44 by 44 CSS px (Apple) or 48 by 48 (Material) for anything tapped with a finger. WCAG 2.2 AA's floor is 24 by 24 (2.5.8). That's a legal minimum, not a comfortable size. Grow the hit area with padding, not the icon. Inline links inside a sentence are exempt. Standalone links and buttons aren't.

```css
.icon-button {
    display: grid;
    place-items: center;
    min-inline-size: var(--size-target-min);
    min-block-size: var(--size-target-min);
}
```

## Viewport and Safe Areas

The viewport meta is `width=device-width, initial-scale=1`. Nothing that blocks zoom. For an edge-to-edge design, add `viewport-fit=cover` and pad with the safe-area insets:

```css
.bottom-nav {
    padding-block-end: max(var(--spacing-2), env(safe-area-inset-bottom));
    padding-inline: max(var(--spacing-4), env(safe-area-inset-left)) max(var(--spacing-4), env(safe-area-inset-right));
}
```

iOS Safari zooms the page when a focused input's font size is under 16px. The fix is a 16px or larger input font. Never disable zoom.

## Touch and Pointer Input

```css
/* Hover styles only where hover exists, so they don't stick after a tap */
@media (hover: hover) {
    .card:hover { translate: 0 calc(-1 * var(--motion-distance-sm)); }
}

/* Controls: no double-tap zoom, no accidental text selection */
button, [role="button"] {
    touch-action: manipulation;
    -webkit-user-select: none; /* Safari still needs the prefix */
    user-select: none;
}

/* A scrollable panel that doesn't scroll the page behind it at its edges */
.sheet-body {
    overflow-y: auto;
    overscroll-behavior: contain;
}
```

- Use Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`). One set of handlers for mouse, touch and pen.
- Always handle `pointercancel`. The browser fires it when it takes over the gesture for scrolling. A drag that ignores it gets stuck.
- Call `element.setPointerCapture(event.pointerId)` on `pointerdown`, so a drag keeps receiving events after the pointer leaves the element.
- Set `touch-action` on a draggable element (`none`, or `pan-y` for a horizontal carousel). That replaces `preventDefault()` in a non-passive touch listener.
- Anything done by dragging also has a tap or button alternative (WCAG 2.5.7). Nothing is reachable by hover alone.

## Base Font Size

Never set a root font size below the default. Never fix it in `px`. Users change the default, and `rem` only respects that if the root is left alone.

```css
/* Correct */
html { font-size: 100%; }

/* Wrong */
html { font-size: 14px; }
html { font-size: 62.5%; }   /* the "1rem = 10px" hack: shrinks everything for users who raised their default */
```

## Progressive Web Apps

Add a manifest and service worker only when installability or offline use is a requirement in the spec. A service worker is a second cache layer on top of the framework's.

```json
{
    "name": "App Name",
    "short_name": "App",
    "id": "/",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1a1a1a",
    "theme_color": "#1a1a1a",
    "icons": [
        { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "/icons/512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
}
```

- The manifest is JSON and can't read CSS variables. Its two colors are the one place hex is written by hand. Keep them equal to the background token. In Next.js, generate the manifest from `app/manifest.ts`.
- The maskable icon is a separate entry. An icon declared only as maskable gets cropped where masks aren't used.
- `shortcuts` and `orientation` don't work on iOS. Install there is manual (Share, then Add to Home Screen), there's no install prompt event, and web push only works for an installed app.

Service worker rules:

- Network-first for navigations with an offline page as the fallback. Cache-first for hashed static assets.
- Version the cache name per deploy and delete old caches on `activate`, or users keep stale assets forever.
- Never cache authenticated or per-user responses. Never intercept non-GET requests.
