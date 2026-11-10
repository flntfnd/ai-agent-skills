---
name: motion-design
description: Cross-platform animation reference for web, iOS/iPadOS/macOS (SwiftUI), and Android (Jetpack Compose), and the canonical definition of the motion tokens (spring, duration, easing) other skills use. Covers the spring-vs-ease decision, duration bounds, and reduced-motion policy; CSS transitions, linear() spring easing, @starting-style entry/exit, scroll-driven animations, View Transitions, Web Animations API; GSAP timelines, ScrollTrigger, SplitText, Flip, useGSAP; Lenis smooth scrolling; Three.js with WebGLRenderer or WebGPURenderer/TSL, post-processing, GLSL shaders, particles; SwiftUI springs, keyframe and phase animators, matchedGeometryEffect, navigation transitions, symbol effects; Compose AnimationSpec, shared elements, and Material 3 Expressive MotionScheme. Use when implementing, reviewing, or specifying UI motion, transitions, springs, easing curves, scroll animations, parallax, shared-element or page transitions, kinetic typography, micro-interactions, or WebGL/WebGPU shader effects.
---

# Motion Design

Motion is the only design property that exists in time. A bad animation isn't reliably wrong the way a bad color is. It can look fine in isolation and fail only when someone interrupts it mid-flight, drags against it, or triggers it twice in a row. This is the API detail for getting it right on each platform, and the home of the motion tokens.

## Rules That Always Apply

1. **Every animation has a behavioral purpose.** It answers *Where did that go? What just happened? What can I do next?* If it answers none of them, remove it.
2. **Motion values come from the design.** If a spring, curve, or duration isn't specified, ask. The tokens are what you ask with. They're not permission to invent motion.
3. **Native APIs first.** CSS and the Web Animations API, SwiftUI animation modifiers, Compose `animate*` APIs. On web, GSAP is my standard once the work needs timeline choreography, pinning, or scrubbed multi-element scroll. Lenis for smooth scrolling. Three.js for GPU visuals.
4. **Timing functions are named tokens.** No inline `cubic-bezier()`, bare duration, or spring constant at a call site. A token is the only way a motion language stays consistent and gets retuned in one place.
5. **Springs for user-triggered motion, ease curves for system-triggered motion.** The reason is below.
6. **Never linear for UI transitions.** Linear is right in exactly two places: continuous loops, and scroll-linked animation, where scroll position is the clock and any easing fights the user's finger.
7. **Honor reduced motion on every platform.** Replace spatial motion with a fade or an instant change. Don't remove the feedback itself.

## Quick Reference

Load only the file for the platform or library in play.

| Topic | Reference |
| --- | --- |
| **Motion tokens**: spring, duration, and easing token names with their Swift, Kotlin, and CSS definitions; duration bounds; reduced-motion policy; anti-patterns to check in review | [reference/cross-platform-tokens.md](reference/cross-platform-tokens.md) |
| Spring physics vocabulary, animation principles applied to UI, why reduced motion matters | [reference/foundations.md](reference/foundations.md) |
| Web: `linear()` springs, `@starting-style` entry/exit, intrinsic-size animation, Web Animations API, scroll-driven animations, View Transitions, `prefers-reduced-motion` | [reference/web-css-transitions.md](reference/web-css-transitions.md) |
| GSAP timelines, ScrollTrigger, SplitText, Flip, `useGSAP`, `gsap.matchMedia()`, cleanup; Lenis | [reference/gsap.md](reference/gsap.md) |
| Three.js: WebGLRenderer vs WebGPURenderer, scene setup, DOM-canvas sync, scroll-driven camera, materials, lighting, disposal | [reference/threejs-core.md](reference/threejs-core.md) |
| Three.js: post-processing on both renderers, style-specific GLSL, particles | [reference/threejs-shaders-particles.md](reference/threejs-shaders-particles.md) |
| SwiftUI: springs, gestures and velocity, keyframes, phases, shared-element and navigation transitions, symbol effects, reordering | [reference/ios-swiftui.md](reference/ios-swiftui.md) |
| Compose: `AnimationSpec`, `MotionScheme`, animation APIs, shared elements, decay, performance | [reference/android-compose.md](reference/android-compose.md) |

Anything version-dependent sits in a short dated **Status** block at the top of the file. Web support status lives in `web-platform` (`reference/browser-compatibility.md`). Apple and Android release status live in `apple-platform` and `android-platform`.

## Spring vs. Ease: The Only Decision That Matters

A duration-based curve is mapped to a fixed time window. Interrupt it halfway and the next animation starts from rest. The velocity breaks and the motion visibly jerks.

A spring is defined by physical properties and has no fixed duration. It resolves when it reaches the target. Interrupted mid-flight, it keeps its velocity and carries on. That's why springs feel natural: they behave like objects with momentum.

**Use a spring for anything triggered by user interaction**: taps, drags, swipes, press states, gesture release. **Use an ease curve for anything automated**: loading states, progress indicators, ambient animation, anything that plays without user input. That one rule settles nearly every "spring or ease" question.

On web, CSS has spring-shaped easing (`linear()`), not spring physics. An interrupted CSS transition retargets from the current value but drops the velocity. That's fine for taps and hovers. For drag release or anything thrown, drive the value from JavaScript.

## The Tokens

Names only. Values and per-platform definitions are in [reference/cross-platform-tokens.md](reference/cross-platform-tokens.md).

```
Springs     snappy · standard · expressive · dragRelease
Durations   micro · fast · standard · slow · cinematic
Easings     enter · exit · standard · emphasized · expo-out · sine-in-out
```

Nothing longer than 700ms in product UI. If an animation needs longer than that to feel right, the design problem isn't solved by more motion.

## When Not to Animate

Don't animate when it adds latency to a task, when it's purely decorative, or when it competes with content. A 300ms transition on a frequent action is a regression, not polish.

## Choosing the Web Layer

Work down this list and stop at the first layer that can express the motion. Each step down costs bundle size and main-thread work.

1. **CSS transition or keyframe animation** -- state changes, entrances and exits, hover and press, scroll-linked reveals and progress, page and shared-element transitions.
2. **Web Animations API** -- the same animations when JavaScript must start, reverse, seek, or await them.
3. **GSAP** -- sequenced multi-element timelines, pinning, scrubbed timelines across many elements, text splitting, FLIP layout transitions.
4. **Lenis** -- only when the design calls for smoothed wheel scrolling. It changes how the whole page feels. Never a default.
5. **Three.js** -- when the visual itself needs the GPU: 3D, shaders, particles, post-processing.
