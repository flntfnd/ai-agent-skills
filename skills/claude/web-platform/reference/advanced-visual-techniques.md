These techniques are what separate hand-crafted visual work from component-library output. Use them deliberately. Each has a specific use and a wrong application.

Style names in comments (Futuristic, Neo-Brutalism and so on) are from `visual-styles`. Motion tokens, durations, easings and GSAP usage belong to `motion-design`. Colors are tokens from `color-system`.

Two rules cover everything here. Decorative motion sits inside `@media (prefers-reduced-motion: no-preference)`. And check every effect on a mid-range phone. Blending, filters and large blurs are cheap to write and expensive to paint.

## Contents

- [Blend Modes](#blend-modes)
- [clip-path and shape()](#clip-path-and-shape)
- [Filters](#filters)
- [Custom Cursor](#custom-cursor)
- [SVG](#svg)
- [Canvas 2D](#canvas-2d)

## Blend Modes

```css
.overlay-text   { mix-blend-mode: overlay; }     /* contrast boost over images */
.ink            { mix-blend-mode: multiply; }    /* darkens, like print ink */
.light-leak     { mix-blend-mode: screen; }      /* lightens: glow, light leaks */
.invert         { mix-blend-mode: difference; }  /* inversion: Retro Computing, glitch */
.punch          { mix-blend-mode: hard-light; }  /* strong contrast: Neo-Brutalism */
.soften         { mix-blend-mode: soft-light; }  /* subtle contrast: Neo-Minimalism */

/* Stop blending at a group boundary */
.blend-group { isolation: isolate; }
```

Blended text has no guaranteed contrast. It depends on whatever is behind it. Never blend body text or anything the user has to read to proceed.

Grain over a surface (Neo-Minimalism, Texture) is a pseudo-element with an inline SVG `feTurbulence` noise as its background, a low opacity token, `mix-blend-mode: multiply`, and `pointer-events: none`.

## clip-path and shape()

```css
.diagonal-cut  { clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%); }
.rounded-inset { clip-path: inset(var(--spacing-2) round var(--radius-md)); }

/* Circle reveal */
.reveal {
    clip-path: circle(0% at 50% 50%);
    transition: clip-path var(--duration-slow) var(--ease-standard);

    &.is-revealed { clip-path: circle(100% at 50% 50%); }
}

/* shape(): path()-style curves in CSS units, so the shape scales with the element */
.wave-edge {
    clip-path: polygon(0 0, 100% 0, 100% 85%, 0 85%);
    clip-path: shape(from 0% 0%, hline to 100%, vline to 85%, curve to 0% 85% with 50% 110%, close);
}
```

- `path()` takes pixel coordinates and doesn't scale. `shape()` takes percentages, `calc()` and custom properties. It's newly available, so a structural shape keeps a `polygon()` declaration before it, as above.
- `clip-path` only animates between shapes of the same type and point count.
- A clipped element's focus outline and box shadow are clipped too. Put the outline on a wrapper, and use `filter: drop-shadow()` on the parent for the shadow.
- A wipe reveal is a CSS transition on `clip-path`. GSAP is for when the reveal is one step in a sequenced timeline.

## Filters

```css
.frosted    { backdrop-filter: blur(var(--effect-blur-md)) saturate(1.5); }
.desaturate { filter: grayscale(1); }
.glow       { filter: drop-shadow(0 0 var(--effect-glow-radius) var(--color-semantic-status-success)); }

/* Duotone: grayscale image, colored gradient blended over it */
.duotone {
    position: relative;

    & img { filter: grayscale(1) contrast(1.2); }

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(var(--color-primitive-blue-300), var(--color-primitive-blue-900));
        mix-blend-mode: color;
        pointer-events: none;
    }
}
```

- `backdrop-filter` needs a partly transparent background to show anything. Contrast-check text over it against the worst-case content behind. Give it an opaque fallback under `prefers-reduced-transparency`.
- A filter creates a stacking context and a containing block for fixed-position descendants. A `position: fixed` child of a filtered element stops being fixed to the viewport.
- Blur cost grows with radius and area. A full-viewport animated `backdrop-filter` is the usual cause of dropped frames on phones.

## Custom Cursor

A signature touch for Futuristic, Neo-Brutalism and Kinetic Typography styles. It's decoration over the real cursor's job. It exists only where there's a fine pointer and motion is welcome, and the native cursor is hidden only after the script has run.

```css
.cursor { display: none; }

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
    html.has-custom-cursor,
    html.has-custom-cursor * {
        cursor: none;
    }

    html.has-custom-cursor .cursor {
        display: block;
        position: fixed;
        inset-block-start: 0;
        inset-inline-start: 0;
        inline-size: var(--size-cursor);
        block-size: var(--size-cursor);
        border-radius: 50%;
        background: var(--color-semantic-interactive-primary);
        pointer-events: none;
        translate: -50% -50%;
        z-index: var(--z-cursor);
        mix-blend-mode: difference; /* inverts against whatever is under it */
    }
}
```

```javascript
const query = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

if (matchMedia(query).matches) {
    const cursor = document.querySelector(".cursor");
    document.documentElement.classList.add("has-custom-cursor");

    // quickSetter reuses one setter instead of creating a tween per event
    const setX = gsap.quickSetter(cursor, "x", "px");
    const setY = gsap.quickSetter(cursor, "y", "px");

    window.addEventListener("pointermove", (event) => {
        setX(event.clientX);
        setY(event.clientY);
    }, { passive: true });
}
```

A trailing ring is a second element driven by `gsap.quickTo`, with a duration and ease from `motion-design`. Grow it over interactive elements with one delegated `pointerover` listener, not a listener per element. Text inputs keep the native text cursor.

## SVG

Inline SVG is DOM. It takes CSS, tokens and `currentColor`.

```css
/* Line drawing. pathLength="1" on the <path> normalizes its length, so no JS measurement */
.path-draw {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset var(--duration-slow) var(--ease-enter);

    &.is-drawn { stroke-dashoffset: 0; }
}
```

- To draw the line with scroll, drive `stroke-dashoffset` with a scroll-driven animation (`motion-design`). Use GSAP ScrollTrigger when the drawing is pinned or sequenced with other elements.
- Morphing between paths with different point counts is GSAP's MorphSVG. Every GSAP plugin is free, MorphSVG, DrawSVG and SplitText included.
- SVG filters do what CSS filters can't. Gooey merge: `feGaussianBlur`, then an `feColorMatrix` that crushes alpha back to a hard edge (`0 0 0 19 -9` in the alpha row). Liquid distortion: `feTurbulence` into `feDisplacementMap`. Define them in a zero-size, `aria-hidden` SVG and apply with `filter: url("#id")`.
- A `url()` filter can't be transitioned. It switches on and off. To animate a distortion, animate the `scale` attribute of `feDisplacementMap`. These filters are expensive to rasterize, so keep the filtered area small.

## Canvas 2D

For procedural drawing: generative art, custom charts, pixel manipulation, and particle systems that don't need WebGL. A canvas is opaque to assistive technology. Decorative canvases get `aria-hidden="true"`. Meaningful ones get a text alternative.

```javascript
export function startCanvas(canvas, draw) {
    const ctx = canvas.getContext("2d");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const size = { width: 0, height: 0 };
    let frame = 0;

    // The backing store is in device pixels. Drawing stays in CSS pixels.
    function resize() {
        const dpr = window.devicePixelRatio;
        size.width = canvas.clientWidth;
        size.height = canvas.clientHeight;
        canvas.width = Math.round(size.width * dpr);
        canvas.height = Math.round(size.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (reducedMotion.matches) draw(ctx, size, 0);
    }

    function tick(milliseconds) {
        draw(ctx, size, milliseconds / 1000);
        frame = requestAnimationFrame(tick);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    if (!reducedMotion.matches) frame = requestAnimationFrame(tick);

    // Call on unmount: a running loop on a detached canvas leaks
    return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
    };
}
```

- `setTransform`, not `scale`, in `resize`. `scale` compounds every time it runs.
- Drawing math uses the CSS-pixel `size`, never `canvas.width`, which is in device pixels. Mixing the two is the classic blurry or off-center canvas bug.
- Canvas can't read CSS variables. Resolve tokens with `getComputedStyle(canvas).getPropertyValue(...)` on resize, not per frame.
- Under reduced motion, draw one static frame. Don't run the loop.
- Pause the loop when the canvas is off-screen (IntersectionObserver). `requestAnimationFrame` stops in background tabs but not for an off-screen canvas.
- For 3D or thousands of particles, that's WebGL. See `motion-design`.
