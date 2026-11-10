# Web: CSS, Web Animations API & View Transitions

CSS comes first for web motion. `transform`, `opacity`, and `filter` can animate on the compositor and stay smooth while the main thread is busy. GSAP ([gsap.md](gsap.md)) is for timeline choreography, pinning, and text splitting. Nothing else.

Every sample uses the tokens from [cross-platform-tokens.md](cross-platform-tokens.md#definitions-per-platform): `--duration-*`, `--ease-*`, `--spring-*`, `--motion-distance-*`. That `:root` block is the only place a curve or duration literal appears.

## Status

Support status lives in `web-platform/reference/browser-compatibility.md`. Check it before shipping. What these samples depend on, as of November 2026:

- **Safe everywhere:** `linear()`, individual transform properties, Web Animations API, `@starting-style` entrances, same-document View Transitions.
- **New in one engine, keep the fallback:** scroll-driven animations (Baseline since 2026-10; Firefox only just shipped them).
- **Enhancement only:** animated exits via `display` (no Firefox), `overlay` and `interpolate-size` (Chromium), cross-document View Transitions (no Firefox). The page has to be correct without them, just less animated.

## Contents

- [Transitions](#transitions)
- [Springs with linear()](#springs-with-linear)
- [Entry and Exit](#entry-and-exit)
- [Animating to Intrinsic Size](#animating-to-intrinsic-size)
- [Web Animations API](#web-animations-api)
- [Scroll-Driven Animations](#scroll-driven-animations)
- [View Transitions](#view-transitions)
- [Reduce Motion (Web)](#reduce-motion-web)

## Transitions

```css
.reveal {
    opacity: 0;
    translate: 0 var(--motion-distance-md);
    transition:
        translate var(--duration-slow) var(--ease-enter),
        opacity var(--duration-standard) var(--ease-enter);
}
.reveal.visible {
    opacity: 1;
    translate: 0 0;
}
```

The individual `translate`, `scale`, and `rotate` properties composite exactly like `transform` and let each take its own duration and curve.

Don't transition `width`, `height`, `top`, `left`, `margin`, `padding`, or `border-width`. They trigger layout every frame. For layout changes use a View Transition, FLIP ([gsap.md](gsap.md#flip-animations)), or the intrinsic-size techniques below. Don't leave `will-change` on permanently. It holds a layer's memory for as long as it applies, and the browser already promotes an element while it animates.

## Springs with linear()

CSS has no spring physics, but `linear()` takes any number of stops, so a spring's response can be sampled into one. That's what the `--spring-*` tokens are.

```css
.button {
    transition: scale var(--spring-snappy-duration) var(--spring-snappy);
}
.button:active {
    scale: 0.97;
}
```

Two limits:

- **It's a spring's shape, not a spring.** The curve assumes a start from rest. An interrupted transition restarts from the current value with zero velocity. For taps, hovers, toggles, and menus you can't tell it from a real spring. For drag release, flings, or anything that inherits gesture velocity, compute the spring in JavaScript per frame.
- **A curve is only valid at its paired duration.** Stretch `--spring-expressive` over two seconds and you get a slow wobble, not a softer spring. A different feel is a new token with new spring parameters, defined in the tokens file.

## Entry and Exit

`@starting-style` gives an element a "before" state the first time it renders or leaves `display: none`, so entrances need no JavaScript.

```css
.toast {
    opacity: 1;
    translate: 0 0;
    transition:
        opacity var(--duration-standard) var(--ease-enter),
        translate var(--duration-standard) var(--ease-enter);

    @starting-style {
        opacity: 0;
        translate: 0 var(--motion-distance-sm);
    }
}
```

Exits need the element to stay rendered until the transition ends. `allow-discrete` lets `display` take part so it flips at the end, and `overlay` keeps a popover or dialog in the top layer meanwhile:

```css
.popover {
    opacity: 0;
    transition:
        opacity var(--duration-fast) var(--ease-exit),
        display var(--duration-fast) allow-discrete,
        overlay var(--duration-fast) allow-discrete;
}
.popover:popover-open {
    opacity: 1;
    transition-timing-function: var(--ease-enter);

    @starting-style {
        opacity: 0;
    }
}
```

Where exits aren't supported the element disappears immediately. That's fine. Don't add JavaScript just to animate an exit.

## Animating to Intrinsic Size

Opening a disclosure to `height: auto` has no transform equivalent.

```css
/* Works everywhere: animate a grid track from 0fr to 1fr */
.disclosure {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--duration-standard) var(--ease-standard);
}
.disclosure[data-open="true"] {
    grid-template-rows: 1fr;
}
.disclosure > .content {
    overflow: hidden;
    min-height: 0;
}

/* Chromium enhancement: lets height transition to and from auto */
:root {
    interpolate-size: allow-keywords;
}
```

Both animate layout, so keep them to small regions.

## Web Animations API

When JavaScript has to start, reverse, seek, or await an animation, use `element.animate()` before a library. It runs the same compositor-backed animations and reads the same tokens.

```javascript
const rootStyle = getComputedStyle(document.documentElement);
const token = (name) => rootStyle.getPropertyValue(name).trim();

async function dismiss(card) {
    const animation = card.animate(
        { opacity: [1, 0], translate: ["0 0", `0 ${token("--motion-distance-sm")}`] },
        {
            duration: parseFloat(token("--duration-fast")),
            easing: token("--ease-exit"),
            fill: "forwards"
        }
    );
    await animation.finished;
    card.remove();
}
```

`reverse()`, `playbackRate`, and `currentTime` cover interruption and scrubbing. If the element stays in the DOM, call `commitStyles()` then `cancel()`. Don't leave a `fill: "forwards"` animation holding styles.

## Scroll-Driven Animations

No JavaScript, and `transform`/`opacity` keyframes run on the compositor. Use them for scroll progress, reveal-on-enter, and single-element parallax. Move to GSAP ScrollTrigger when a section has to pin or one scrubbed timeline choreographs many elements.

The timing function is `linear` on purpose: scroll position is the clock. Shape the motion with keyframe offsets and `animation-range`.

```css
/* Scroll progress timeline: tied to a scroll container's position */
.progress-bar {
    transform-origin: left;
    animation: grow linear both;
    animation-timeline: scroll(root block);   /* after the shorthand, which resets it */
}
@keyframes grow {
    from { scale: 0 1; }
    to   { scale: 1 1; }
}

/* View timeline: tied to the element's own visibility in the scrollport */
.section-reveal {
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
}
@keyframes reveal {
    from { opacity: 0; translate: 0 var(--motion-distance-md); }
    to   { opacity: 1; translate: 0 0; }
}

/* Named timeline: several elements driven by one scroller */
.scroll-container {
    scroll-timeline: --hero-scroll block;
}
.hero-text {
    animation: fade-out linear both;
    animation-timeline: --hero-scroll;
    animation-range: 0% 30%;
}
@keyframes fade-out {
    to { opacity: 0; }
}
```

For the fallback, ship a base state driven by a class from `IntersectionObserver` and upgrade inside `@supports`.

```css
.animated-element {
    opacity: 0;
    translate: 0 var(--motion-distance-md);
    transition:
        opacity var(--duration-slow) var(--ease-enter),
        translate var(--duration-slow) var(--ease-enter);
}
.animated-element.visible {
    opacity: 1;
    translate: 0 0;
}

@supports (animation-timeline: view()) {
    .animated-element {
        transition: none;
        animation: reveal linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 60%;
    }
}
```

## View Transitions

Same-document transitions start from JavaScript. Cross-document transitions are declared in CSS for multi-page sites. A browser without support just navigates normally.

```javascript
function navigateTo(url) {
    if (!document.startViewTransition) {
        return loadPage(url);
    }
    return document.startViewTransition(() => loadPage(url)).finished;
}
```

```css
/* The default is a root cross-fade. Name an element to morph it between states. */
.hero-image {
    view-transition-name: hero;
}

::view-transition-group(hero) {
    animation-duration: var(--duration-slow);
    animation-timing-function: var(--ease-emphasized);
}
::view-transition-old(root) {
    animation: var(--duration-fast) var(--ease-exit) both fade-out;
}
::view-transition-new(root) {
    animation: var(--duration-standard) var(--ease-enter) both fade-in;
}

@keyframes fade-out { to { opacity: 0; } }
@keyframes fade-in { from { opacity: 0; } }
```

A `view-transition-name` has to be unique among rendered elements at capture time. Two elements sharing one aborts the transition. For lists, give each item its own name with an inline style and style them as a group with `view-transition-class`.

Cross-document:

```css
/* In the CSS of every page that should participate */
@view-transition {
    navigation: auto;
}
```

Both documents have to opt in. The transition only runs for a same-origin navigation with no cross-origin redirect. Back and forward qualify. A new navigation qualifies only when it starts from the page (link, form, script), not from browser UI like the address bar. Reloads never transition. Names and pseudo-elements work exactly as above.

## Reduce Motion (Web)

The policy is in [cross-platform-tokens.md](cross-platform-tokens.md#reduced-motion-policy). In CSS, write spatial motion as an opt-in for users who haven't asked for less. The fade stays for everyone.

```css
.reveal {
    opacity: 0;
    transition: opacity var(--duration-fast) var(--ease-enter);
}
.reveal.visible {
    opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
    .reveal {
        translate: 0 var(--motion-distance-md);
        transition:
            translate var(--duration-slow) var(--ease-enter),
            opacity var(--duration-standard) var(--ease-enter);
    }
    .reveal.visible {
        translate: 0 0;
    }
}

/* Scroll-linked motion and View Transition movement are removed outright */
@media (prefers-reduced-motion: reduce) {
    .parallax,
    .section-reveal {
        animation: none;
        opacity: 1;
        translate: none;
    }

    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
        animation: none;
    }

    html {
        scroll-behavior: auto;
    }
}
```

The global reset (`* { animation-duration: 0.01ms !important; ... }`) kills fades and spinners too. Scope it to third-party markup you don't control. It isn't the primary mechanism.

In JavaScript, `window.matchMedia("(prefers-reduced-motion: reduce)")` gives the same answer. Listen for its `change` event, because the user can flip the setting while the page is open. GSAP doesn't read the preference on its own ([gsap.md](gsap.md#reduced-motion)). Lenis does by default.
