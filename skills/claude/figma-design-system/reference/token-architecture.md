# Token Architecture

This file defines token naming for the whole skill library. `color-system`, `web-platform`, `apple-platform`, `android-platform`, `visual-styles`, and `motion-design` all follow it. Values aren't defined here. Each family names the skill that has its values.

## Contents
- [Three Tiers](#three-tiers)
- [Token Families](#token-families)
- [Conversion Rule](#conversion-rule)
- [Platform-Supplied Tokens](#platform-supplied-tokens)
- [Variable Collections in Figma](#variable-collections-in-figma)
- [Light and Dark Modes](#light-and-dark-modes)
- [Typography](#typography)
- [Spacing and Radius](#spacing-and-radius)

## Three Tiers

Never apply a primitive directly to a component. Alias through a semantic token.

**Tier 1: Primitive.** Raw values, never applied directly. `color/primitive/warm-200`, `spacing/primitive/16`, `radius/primitive/8`.

**Tier 2: Semantic.** Meaning and intent. This is what gets applied. `color/semantic/background/primary`, `spacing/5`, `radius/md`.

**Tier 3: Component.** Enterprise scale only. `button/primary/background/default`, `card/border`.

Semantic tokens are the endpoint for most projects. Component tokens only pay off with multiple teams and strict governance. Three tiers is the max. Two is often enough.

## Token Families

Figma paths are lowercase, slash-separated, kebab-case inside a segment. Every token in every skill is one of these.

| Family | Figma path | Names in use | Values come from |
| --- | --- | --- | --- |
| Color, primitive | `color/primitive/<name>` | The palette name verbatim: `swiss-red`, `warm-200`, `cool-900`. A project ramp is `<hue>-<step>`, steps 50 to 950 | `color-system` (reference/palette.md) |
| Color, semantic | `color/semantic/<group>/<role>` | Groups: `background`, `text`, `border`, `status`, `interactive`, `accent`. Roles below | `color-system` (semantic mappings) |
| Color, component | `<component>/<variant>/<property>/<state>` | `button/primary/background/hover`, `card/background`. Drop segments that don't apply | Aliases of semantic tokens only |
| Spacing | `spacing/<step>`, primitive `spacing/primitive/<px>` | Steps `1` to `12` | This file |
| Radius | `radius/<size>`, primitive `radius/primitive/<px>` | `none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `sheet`, `pill` | This file |
| Size | `size/<name>` | Fixed dimensions: `size/target-min`, `size/header-height` | Platform skills |
| Stacking | `z/<layer>` | One token per layer: `z/modal`, `z/toast` | Platform skills |
| Effect | `effect/<kind>/<step>` | `effect/blur/md`, `effect/glow/radius` | `visual-styles`, platform skills |
| Shadow | `shadow/<name>` | A whole shadow recipe: `shadow/raised`, `shadow/inset`, `shadow/hard-sm` | `visual-styles`, platform skills |
| Typography | `typography/family/<name>`, `typography/size/<role>`, `typography/weight/<name>`, `typography/leading/<name>` | Below | Platform skills (sizes), this file (names) |
| Motion | `motion/spring/<name>`, `motion/duration/<name>`, `motion/ease/<name>`, `motion/distance/<size>` | Listed in `motion-design` (reference/cross-platform-tokens.md), not here | `motion-design` |
| Glass | `glass/<parameter>/<variant>` | Figma-only, in [liquid-glass.md](liquid-glass.md) | No code equivalent. The system draws glass |

Semantic color roles:

```
color/semantic/background/primary | secondary | elevated
color/semantic/text/primary | secondary | disabled
color/semantic/border/default | focus
color/semantic/status/success | warning | error
color/semantic/interactive/primary | primary-hover | primary-pressed
color/semantic/accent/primary | secondary | tertiary
```

The six groups are fixed. `accent` is decorative brand color that isn't interactive. New roles go inside a group (`text/inverse`, `status/info`). A state is a suffix on its role (`-hover`, `-pressed`, `-disabled`), not a new segment. Name by meaning, never by appearance: `interactive/primary`, not `purple-500`.

A style in `visual-styles` can declare extra style-local tokens. They follow the same families and the same conversion rule.

## Conversion Rule

One Figma path gives every platform's name mechanically. Nothing is abbreviated, reordered, or dropped.

- **Figma:** as written.
- **CSS:** `--`, then every segment joined with `-`.
- **Swift:** every segment but the last is a PascalCase namespace. The last is lowerCamelCase.
- **Kotlin:** same as Swift, on the project's token object.

| Figma | CSS | Swift and Kotlin |
| --- | --- | --- |
| `color/semantic/background/primary` | `--color-semantic-background-primary` | `Color.Semantic.Background.primary` |
| `color/primitive/warm-200` | `--color-primitive-warm-200` | `Color.Primitive.warm200` |
| `spacing/5` | `--spacing-5` | `Spacing.s5` |
| `radius/2xl` | `--radius-2xl` | `Radius.r2xl` |
| `size/target-min` | `--size-target-min` | `Size.targetMin` |
| `z/modal` | `--z-modal` | `Z.modal` |
| `effect/blur/md` | `--effect-blur-md` | `Effect.Blur.md` |
| `typography/size/display-lg` | `--typography-size-display-lg` | `Typography.Size.displayLg` |

Hyphenated names become lowerCamelCase in Swift and Kotlin: `expo-out` is `expoOut`.

**A last segment that starts with a digit** can't be a Swift or Kotlin identifier. It takes the lowercase first letter of its parent segment: `spacing/5` → `Spacing.s5`, `radius/2xl` → `Radius.r2xl`. CSS needs no prefix.

Motion has two exceptions. They're the only ones.

| Figma | CSS | Swift | Kotlin |
| --- | --- | --- | --- |
| `motion/spring/snappy` | `--spring-snappy` | `Motion.Spring.snappy` | `Motion.Spring.snappy()` |
| `motion/duration/standard` | `--duration-standard` | `Motion.Duration.standard` | `Motion.Duration.standard` |
| `motion/ease/expo-out` | `--ease-expo-out` | `Motion.Ease.expoOut` and `Motion.Curve.expoOut` | `Motion.Ease.expoOut` |
| `motion/distance/sm` | `--motion-distance-sm` | `Motion.Distance.sm` | `Motion.Distance.sm` |

- **CSS drops the `motion` segment** for springs, durations, and eases. `motion/distance` keeps it.
- **In Swift, `motion/ease/<name>` gives two members.** `Motion.Ease.<name>` is the ready-to-use Animation, the curve at its default duration. `Motion.Curve.<name>` is the bare curve.

Kotlin follows the rule with nested objects. Springs are generic functions, so they're called: `Motion.Spring.snappy()`.

If a codebase already ships tokens under other names, the code's names win. Rename the Figma variable so it converts to them. The rule decides names for anything new.

**Code syntax carries the name.** Every Figma variable has a per-platform code syntax field (Web, Android, iOS). Dev Mode and the MCP read tools show it. Set it on every variable, for every platform the project targets, to the literal string a developer types: `var(--color-semantic-background-primary)` for Web, with the `var()` wrapper, and `Color.Semantic.Background.primary` for iOS. A variable with the right path and an empty or wrong code syntax fails the token-name gate.

## Platform-Supplied Tokens

Where the platform already provides the token, don't redefine it in code. The Figma variable keeps its semantic path, because one file serves several platforms. The platform's own name goes in that platform's code syntax field.

| Figma token | SwiftUI | Compose (Material 3) |
| --- | --- | --- |
| `color/semantic/background/primary` | `Color(.systemBackground)` | `MaterialTheme.colorScheme.surface` |
| `color/semantic/background/secondary` | `Color(.secondarySystemBackground)` | `MaterialTheme.colorScheme.surfaceContainer` |
| `color/semantic/text/primary` | `Color(.label)` | `MaterialTheme.colorScheme.onSurface` |
| `color/semantic/text/secondary` | `Color(.secondaryLabel)` | `MaterialTheme.colorScheme.onSurfaceVariant` |
| `color/semantic/border/default` | `Color(.separator)` | `MaterialTheme.colorScheme.outline` |
| `color/semantic/interactive/primary` | `Color.accentColor` | `MaterialTheme.colorScheme.primary` |
| `color/semantic/status/error` | project token | `MaterialTheme.colorScheme.error` |

Use the platform token when it covers the case. Project tokens fill the gaps: brand colors, product-specific surfaces, anything the system palette doesn't have. The full platform sets are in `apple-platform` and `android-platform`.

## Variable Collections in Figma

Four collections, kept separate.

**Primitives.** All raw values. One mode. No light/dark here.

**Semantic Color.** Modes: Light, Dark. Every semantic color aliases a primitive. Switching modes swaps the alias target, not the token name.

**Semantic Spacing, Radius, Motion.** Number variables, one mode. Add modes only for density variants. If the file uses Figma Motion, durations and easing curves are timing and easing variables, not plain numbers.

**Typography.** String variables for font family and weight, number variables for size and line height. One family variable retypes the whole system.

On every variable:
- **Scope** it to where it can be used. A text color to text fills, a radius to corner radius. Primitives are scoped to nothing, so they can't be applied directly. That enforces the tier rule.
- **Code syntax** per target platform.

**Mode limits change what can be built.** Light and Dark fit every paid plan. Before designing a collection around many modes (brand × theme × density × contrast), check the per-plan limit in [platform-status.md](platform-status.md). Multi-brand theming through extended collections is Enterprise only. On other plans, multi-brand is separate brand collections aliased by the semantic layer.

## Light and Dark Modes

Both modes live in the Semantic Color collection. Every token has a Light value and a Dark value, and both alias primitives. Never put a raw hex value in a semantic token.

```
color/semantic/background/primary
  Light: → color/primitive/warm-200
  Dark:  → color/primitive/cool-900
```

Which primitive each role aliases in each mode is `color-system`'s call, or the project palette's. Not this file's.

Design in dark mode first. If it works in dark, it almost always works in light. The reverse doesn't hold.

Set the mode on each screen's top frame. Layers default to Auto and inherit from the nearest parent with a mode set, so nothing inside a component carries an explicit mode. For review, place each screen twice, one frame Light and one Dark, side by side.

## Typography

```
typography/family/sans      → "SF Pro" (iOS), "Roboto Flex" (Android), project typeface (Web)
typography/family/mono      → "SF Mono", "Roboto Mono", project mono

typography/size/display-lg  → 40
typography/size/display-sm  → 32
typography/size/title-lg    → 28
typography/size/title-md    → 22
typography/size/title-sm    → 20
typography/size/headline    → 17
typography/size/body        → 17
typography/size/callout     → 16
typography/size/subhead     → 15
typography/size/footnote    → 13
typography/size/caption     → 12

typography/weight/regular | medium | semibold | bold   → "Regular", "Medium", "Semibold", "Bold"
typography/leading/tight | normal | relaxed            → 1.2, 1.5, 1.7
```

These sizes are iOS and iPadOS at the default Dynamic Type size, from `apple-platform` (reference/color-typography.md). `title-lg`, `title-md`, `title-sm` are Apple's title, title2, title3. macOS, Android, and Web sizes come from their platform skills. Where they differ, the Typography collection gets one mode per platform, not a second set of names.

One text style per semantic role, not per size:

```
Display Large / Small    hero content, section headers
Title Large / Medium / Small    screen titles, card headers, subheaders
Headline                 emphasized body
Body                     primary reading content
Callout                  supporting text
Subheadline              metadata
Footnote                 timestamps, legal
Caption                  image captions, form help text
Label Large / Medium / Small    button labels, tags, badges
```

Text styles reference the typography variables. Ask for that binding explicitly and read it back afterwards. The plugin's library-generation path creates text styles with literal values unless told otherwise, and a style with raw numbers inside looks correct until the typeface changes. The font has to be uploaded to the Figma account. One installed only locally isn't available to an MCP session.

## Spacing and Radius

8pt grid. All spacing tokens are multiples of 4, preferring multiples of 8. Apply them as number variables to padding and gap in Auto Layout frames. No hardcoded values.

```
spacing/1 → 2     spacing/5 → 16 (base)    spacing/9  → 40
spacing/2 → 4     spacing/6 → 20           spacing/10 → 48
spacing/3 → 8     spacing/7 → 24           spacing/11 → 64
spacing/4 → 12    spacing/8 → 32           spacing/12 → 80
```

```
radius/none → 0    radius/md → 12    radius/2xl   → 28
radius/xs   → 4    radius/lg → 16    radius/sheet → 34
radius/sm   → 8    radius/xl → 24    radius/pill  → capsule
```

`radius/pill` is a capsule, not a number. In code it's the platform's capsule shape (`.capsule` in SwiftUI), never a large radius. Figma needs a number, so the variable holds any value larger than half the tallest pill in the file. That number is a Figma artifact. It never goes in code syntax.

On iOS, `radius/2xl` is the floating-panel radius (`Radius.r2xl`, 28) and `radius/sheet` is the sheet radius (`Radius.sheet`, 34). Cards aren't glass. On Android, `radius/md` is Material's medium shape (12dp) and `radius/2xl` its extraLarge (28dp). The full shape scale is in `android-platform`.
