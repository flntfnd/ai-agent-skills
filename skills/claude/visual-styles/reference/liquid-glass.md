# Liquid Glass

Apple's system material for the navigation layer: translucent bars and controls that refract and adapt to the content scrolling beneath them. It's a layout decision (glass floats above edge-to-edge content), not a surface texture applied afterwards. It's also the native default on Apple platforms, so a request for it means build it natively.

`apple-platform` owns the rule, the API, the values, and the platform status. Read its `reference/liquid-glass.md` and `reference/platform-status.md`. This file only places the style among the others.

**When to use**: iOS, iPadOS, and macOS apps that follow Apple's HIG.

**Not to be confused with**: Glassmorphism / Frosted, which is static blur plus opacity, applies to content-level cards and panels, and works on every platform. Liquid Glass is a system material with real-time lensing, confined to the navigation layer, on Apple platforms only.

## Visual Signature

Identifiable at a glance by: navigation bars, tab bars, toolbars, and floating controls that are translucent and refract what scrolls under them, while content runs edge to edge beneath.

**Structural requirements:**
- Glass on the navigation layer only. Content sits below it and extends behind it.
- The material comes from the system API. Nothing is hand-built from blur and opacity.

**Wrong if:** a navigation bar has a solid opaque fill, content doesn't extend behind the glass, glass is applied to content-level elements (list rows, cards, images), or the effect is imitated with custom blur.

## Token Modifications

None. System semantic colors, SF Pro, and system materials; see `apple-platform`.

## Component Rules

Standard system bars, tab bars, sheets, and toolbars, behaving as Apple defines them. See `apple-platform`.

## Accessibility

The system material responds to Reduce Transparency, Increase Contrast, and the user's glass appearance setting on its own. Custom text or controls placed over glass must stay legible across whatever content can scroll beneath.

## Platform Implementation

Signature technique: Apple's own rendering. Use the native API; don't replicate it.

**iOS / SwiftUI**: `.glassEffect()` and the system containers, per `apple-platform`.

**Android / Compose** and **Web**: not available. When a brief asks for Liquid Glass on these platforms, apply Glassmorphism / Frosted (`glassmorphism.md`), and say that it's a different material. Don't simulate lensing with shaders or canvas.
