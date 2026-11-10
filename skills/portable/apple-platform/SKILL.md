---
name: apple-platform
description: "Apple platform design system reference for SwiftUI on iOS 27, iPadOS 27, and macOS 27 Golden Gate (Xcode 27 SDK). Covers Liquid Glass (glassEffect, GlassEffectContainer, glass button styles, morphing, the Liquid Glass slider setting), semantic color and typography tokens, Display P3, spacing, motion tokens (spring vs ease), SF Symbols effects, haptics, navigation (tab bars, tab roles, NavigationSplitView, sidebars, toolbars, toolbar overflow and minimization, sheets, menus), accessibility (Reduce Transparency, Increase Contrast, Reduce Motion, Dynamic Type, VoiceOver, touch targets), custom rendering (Canvas, Animatable, AttributedString, shader effects, Metal), and what changed between 26 and 27. Use when building, reviewing, or auditing native Apple UI in SwiftUI, implementing Liquid Glass, checking whether a design or Figma frame reads as authentically iOS, iPadOS, or macOS, choosing or verifying a SwiftUI API, checking HIG compliance, or migrating an iOS 26 / macOS Tahoe app or design file to 27."
---

# Apple Platform Design System

SwiftUI only. No UIKit unless explicitly required.

Baseline is iOS 27 / iPadOS 27 / macOS 27 Golden Gate, built with the Xcode 27 SDK. Code and design files both follow the 27 design language. There's no compatibility opt-out. Version numbers, dates, and what changed since 26 live only in [reference/platform-status.md](reference/platform-status.md). Read it before quoting a version, before using an API marked (27) in a project that deploys to 26, and for any 26-era code or design file.

## Quick Reference

| Topic | Covers | Reference |
| --- | --- | --- |
| Liquid Glass | Variants, `glassEffect(_:in:)`, `GlassEffectContainer`, unions, morphing and transitions, glass button styles, the user's Liquid Glass slider, glass tokens, layering anti-patterns, performance | [reference/liquid-glass.md](reference/liquid-glass.md) |
| Color & typography | Semantic system colors, custom color tokens, Display P3, type scale, Dynamic Type, color on glass, spacing tokens. Palette values come from the `color-system` skill. | [reference/color-typography.md](reference/color-typography.md) |
| Motion & interaction | Apple motion rules, glass motion, symbol effects, gestures, haptics, Reduce Motion. Token names and values come from the `motion-design` skill. | [reference/motion-interaction.md](reference/motion-interaction.md) |
| Navigation & components | Tab bars and tab roles, search, iPad and Mac sidebars, toolbars (grouping, overflow, pinning, minimization), menus, sheets, floating actions, inactive windows, foldable layout | [reference/navigation-components.md](reference/navigation-components.md) |
| Accessibility | Reduce Transparency, Increase Contrast, Reduce Motion, the Liquid Glass slider, Dynamic Type, VoiceOver, contrast on glass, touch targets | [reference/accessibility.md](reference/accessibility.md) |
| Custom rendering | SwiftUI Canvas, `@Animatable` shapes, `AttributedString` typography, shader effects, Metal | [reference/custom-rendering.md](reference/custom-rendering.md) |
| Design file frames | iPhone and iPad frame structure, safe areas, and layer order for Figma work | [reference/design-file-frames.md](reference/design-file-frames.md) |
| Platform status | Current OS, Xcode, and Swift versions with dates, the 26 to 27 design and API delta, names that changed before release, deprecations | [reference/platform-status.md](reference/platform-status.md) |

Load the one file the task needs. For an API these files don't show, check the installed SDK. Don't guess.

## Philosophy

Liquid Glass is a navigation-layer material. It floats above content. It does not touch content.

Three layers, in order:
1. Content (bottom): lists, media, text, cards. No glass.
2. Navigation (middle): toolbars, tab bars, sidebars, floating controls. Liquid Glass lives here.
3. Overlay (top): vibrancy, fills, and text rendered on glass surfaces.

If you're applying glass to content, you're doing it wrong. Cards are content. The API, the values, and the one system exception are in liquid-glass.md.

## Platform Visual Signature

A correct design is immediately recognizable as Apple-made. If it reads as a web app or as Android, it's wrong. Check this on nearly every task.

**What makes it immediately look like iOS:**
- Tab bar sits at the bottom of the screen with glass treatment, floating above content
- Content scrolls behind both the status bar at top and the tab bar at bottom (edge-to-edge)
- Navigation is push-based: screens slide left/right. Back button in the upper-left.
- Large title at the top of a navigation stack collapses as the user scrolls
- Partial-height sheets are inset from the screen edges, float with rounded corners and a glass background, and turn more opaque when expanded to full height
- SF Pro font throughout. No third-party fonts unless deliberately part of a brand decision.
- SF Symbols for all iconography. No custom icon libraries.
- Semantic colors. The background shifts automatically between light and dark.

**What makes it immediately look like macOS:**
- Standard window chrome (traffic light buttons top-left, window title centered or leading)
- Sidebar on the left with icon + label navigation, running edge-to-edge (top, bottom, and side of the window). Part of the window, not an inset floating panel. Icons take the accent color. In an inactive window, icons and text dim.
- Toolbar at the top with glass controls on the system's uniform toolbar treatment, the same in every app
- Window shape and corner radius are the system's. Contained elements are concentric with it. An app doesn't design its own window radius.
- Menus carry icons only where they clarify. Most menu items are text only.

**Wrong if:**
- Tab bar is at the top (that's web or Android)
- Navigation bar has a solid opaque background (content should extend behind it)
- Colors are hardcoded instead of semantic (system semantic colors, or the project's own semantic tokens)
- Icons are not SF Symbols
- Text fields, buttons, or lists look like generic HTML form controls
- There is no glass treatment on the navigation layer
- A partial-height sheet is flush to the screen edges with no inset rounding
- Safe areas are ignored (content or interactive elements under the status bar or in the home indicator zone)
- A Mac sidebar is drawn as an inset floating card, or a Mac toolbar's transparency is hand-tuned per screen (both are the 26 look)
