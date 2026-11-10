# Liquid Glass in Figma

Figma mechanics only: how to build the effect, what the API can't do, and when to use Apple's kit. Where glass belongs, the SwiftUI API, the regular and clear variants, and how the material looks in the current OS are all in `apple-platform` (reference/liquid-glass.md, and reference/platform-status.md for what changed between releases). Read those first. Nothing here overrides them.

## Contents
- [Start From Apple's Kit](#start-from-apples-kit)
- [States the System Draws](#states-the-system-draws)
- [Critical Rules](#critical-rules)
- [Step-by-Step](#step-by-step)
- [Glass Tokens](#glass-tokens)
- [Regular, Clear, Identity](#regular-clear-identity)
- [Building Glass Components](#building-glass-components)
- [Known Limitations](#known-limitations)
- [Glass Anti-Patterns](#glass-anti-patterns)

## Start From Apple's Kit

For system chrome (tab bars, toolbars, sidebars, sheets, alerts, standard controls), use the components in Apple's current iOS and iPadOS and macOS Figma kits. Links are in [platform-status.md](platform-status.md). They carry Apple's own glass settings, and their component names line up with code names, which is what the token-name gate wants. Don't hand-dial a tab bar Apple already ships.

The recipe below is for custom glass elements the kit doesn't have. Put the nearest kit component beside the one being built and match its edge, highlight, and diffusion before settling values.

## States the System Draws

Figma can't simulate two system behaviors. Draw them as states.

- **The user's Liquid Glass setting.** People can move glass between nearly clear and nearly opaque. Design at the default. Then check that every label and icon on a custom glass component stays legible at both ends: one copy with frost and fill opacity at the bottom of the ranges below, one with both well above the top.
- **The scrolled state.** When content scrolls under floating bars, the system applies a uniform bar treatment. Draw the scrolled state of every screen with that treatment from the kit. Not with content showing clearly through individual floating buttons.

The parameter ranges below were tuned against iOS 26. The current material diffuses more, with a darker edge and a brighter highlight. Bias frost toward the top of its range for anything over scrolling content, and match the kit component.

## Critical Rules

**Fill opacity below 100%.** Glass doesn't render on a fully opaque fill.

**No background blur on the same layer.** Only the first effect in the stack renders. If both are needed, layer them: glass object on top, background blur object beneath.

**Glass needs content underneath.** Over a flat white or solid background it shows nothing. Put imagery, gradients, or rich color beneath it.

**Stack order matters.** Glass renders what's directly behind it in the layer stack. Glass behind glass doesn't compound. Figma doesn't factor background glass into foreground glass.

## Step-by-Step

1. Set up the background: a rich image, gradient, or layered content where the glass will sit.

2. Create a frame, shape, or component for the effect. Pills are a capsule (`radius/pill`). Floating panels and sheets use `radius/2xl` and `radius/sheet`.

3. Set a semi-transparent fill. Regular glass: white at 8-15% opacity. Clear glass: white at 4-8%.

4. In the Effects panel, click `+` and select Glass.

5. Set the parameters:
   - **Light angle**: 135-145° (upper-left). One angle for every glass element in the file.
   - **Light intensity**: 70-80%.
   - **Refraction**: 70-90%. Above 90, text gets unreadable fast. Start at 75.
   - **Depth**: 10-30%. Higher is thicker glass. Start at 15.
   - **Dispersion**: 30-50%. Subtle is better. Start at 35.
   - **Frost**: 5-15% for nav bars and toolbars, 30-50% for sheets, 50-70% for modals.
   - **Splay**: 20-40%.

6. Add the highlight border: stroke, inside, 1px, white at 22% opacity. 35% where the edge has to read more strongly.

7. Add the depth shadow: Drop shadow, X 0, Y 8, Blur 18, Spread 0, black at 18% opacity.

Steps 6 and 7 are the `GlassTokens.Stroke` and `GlassTokens.Shadow` values from `apple-platform`. They exist to approximate in a design file what the system draws by itself in SwiftUI. They don't get implemented on a `.glassEffect()`.

## Glass Tokens

Define the glass values as number variables in a Glass collection with two modes, Regular and Clear. Switching the mode previews the difference across every glass element at once.

```
glass/light/angle           → 140
glass/light/intensity       → 75

glass/refraction/regular    → 78
glass/refraction/clear      → 88

glass/depth/default         → 15
glass/dispersion/default    → 35
glass/splay/default         → 30

glass/frost/navigation      → 10
glass/frost/toolbar         → 8
glass/frost/sheet           → 40
glass/frost/modal           → 60
```

These are Figma-only tokens. No code syntax, because code never sets them.

**Binding glass parameters is a manual step.** The Effects panel accepts variables on Glass properties. The Plugin API doesn't: glass effects don't support variable binding there, and its glass type has no splay field. `use_figma` runs on the Plugin API, so an MCP session can create the effect and set values. It can't bind them and it can't set splay. Through MCP:

- Set each parameter to the literal value of its token. Build the fill, stroke, and shadow on variables as usual. Those bind.
- The API's units differ from the panel. Light intensity, refraction, and dispersion are 0 to 1. Depth is 1 or greater. Frost is `radius`.
- Report parameter binding and splay as outstanding manual work. Don't claim a glass component is fully token-bound when it isn't.
- Take a screenshot. If the edge highlight is missing, the effect was applied by script and needs re-checking in the panel. That goes on the manual list too.

## Regular, Clear, Identity

Which variant a surface gets is `apple-platform`'s rule. In Figma:

**Regular.** Fill white 10-15% opacity, frost 8-15, refraction 75-80, depth 12-18.

**Clear.** Fill white 4-8% opacity, frost 0-5, refraction 85-90, depth 8-12. Where the rule calls for a dimming layer under clear glass, build it as its own layer between the media and the glass component.

**Identity** (glass conditionally off). A variant with the effect removed. Boolean component properties toggle layers, not effects.

## Building Glass Components

Build glass elements as components with a `Variant` property (`Regular` / `Clear`) that switches configuration by mode switch, not by re-applying the effect.

Inside the component:
- Background layer: slot (accepts any content behind the glass)
- Glass frame: Auto Layout, semi-transparent fill, glass effect applied
- Highlight stroke and depth shadow from steps 6 and 7

The component has to sit over real content for the glass to show. Alone on an empty canvas it looks flat. That's expected, not a bug. On the Components page, give each glass component a rich backdrop frame so it can be judged where it's documented.

## Known Limitations

- One glass effect per layer.
- No environmental reflections or device-motion highlights. That's the rendering engine, not a static effect.
- Glass parameters can't be variable-bound or given a splay value through the Plugin API, so not through MCP either.
- Stripped on SVG export. Not supported in Figma Sites.
- Background blur and glass conflict on the same layer.
- Doesn't render over a fill at 100% opacity.

## Glass Anti-Patterns

Glass on list rows, cards, or body text. Navigation layer only.

A hand-built tab bar or toolbar where Apple's kit component exists.

Frost set too high on nav bars. The glass goes opaque and legibility drops.

Refraction above 90. Text and icons distort.

Different light angles across components. Pick one for the file and keep it.

Legibility checked at one transparency level only.
