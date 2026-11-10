# Component Architecture

## Contents
- [Structure Rules](#structure-rules)
- [Component Inventory and States](#component-inventory-and-states)
- [Auto Layout](#auto-layout)
- [Responsive Components and Frame Widths](#responsive-components-and-frame-widths)
- [Component Properties](#component-properties)
- [Slots](#slots)
- [Interactive Components](#interactive-components)
- [Variables in Prototypes](#variables-in-prototypes)
- [Platform Variants](#platform-variants)

## Structure Rules

Every component:
- Outer frame: Auto Layout, defines padding and overall sizing
- Inner groups: organized by content zone
- All colors: semantic color variables
- All spacing: spacing number variables
- All type: text style referencing typography variables
- Layer names: match code component and prop names exactly

**Variables versus styles.** A variable holds one value. A style composes several. Every single value is a variable. Styles exist only as composites built from variables: text styles, effect styles (shadow stacks), gradient paint styles. Solid color styles are legacy.

## Component Inventory and States

The component list and the state list are defined here and nowhere else. Other files and skills point here.

**Atoms:** button, icon button, input, checkbox, radio, toggle, badge, chip, avatar.

**Molecules:** list row, card, nav bar, tab bar, modal, sheet, tooltip. Assembled from atoms.

**States.** Design all of them before building any:

```
Button:  Default, Hover, Pressed, Focused, Disabled, Loading
Input:   Empty, Filled, Focused, Error, Disabled, Read-only
Card:    Default, Hover, Pressed, Selected, Disabled
```

Other stateful components take the subset of the button list that applies, plus their own. A toggle adds On/Off.

**Property names.** One meaning each, across the whole system:

| Property | Values |
| --- | --- |
| `State` | The state names above |
| `Size` | `Small`, `Medium`, `Large` |
| `Style` | `Primary`, `Secondary`, `Ghost`, `Destructive` |
| `Platform` | `iOS`, `Android`, `Web` |
| `Breakpoint` | `Mobile`, `Tablet`, `Desktop` (Web) |
| `SizeClass` | `Compact`, `Regular`, `Large` (iOS/iPadOS) |

## Auto Layout

Every component uses Auto Layout. No exceptions. A component without it breaks when content changes.

**Direction.** Horizontal for rows (nav bars, button groups, list rows). Vertical for columns (cards, forms, modals). Grid for real two-dimensional layouts where items span rows or columns. Don't fake a grid with nested rows and columns, and don't use grid where a wrapping row does the job.

**Spacing.** Fixed between specific elements. Space-between for elements that push apart.

**Padding.** Spacing tokens. Never hardcoded.

**Resizing.** Hug when the component wraps its content. Fill when it expands to the container.

**Min/max dimensions.** Set them where content could overflow or the component could get unusably small or large.

**Absolute positioning.** Sparingly, and only for elements that overlay others on purpose: badges on icons, decorative elements, glass overlays. Clip the frame when absolute children shouldn't affect the flow.

## Responsive Components and Frame Widths

For a component that changes across widths, make a variant property whose values match the breakpoint names. Figma Sites switches variants by matching variant values to breakpoint names. The same pattern serves documentation and handoff.

Web breakpoints:
```
Mobile:  375-767
Tablet:  768-1023
Desktop: 1024+
```

Android screens are framed by window size class, not these breakpoints: compact under 600dp, medium 600-839, expanded 840-1199, large 1200-1599, extra-large 1600 and up. Frame structures and the navigation component for each class are in `android-platform`. Apple device frames and size classes are in `apple-platform`.

## Component Properties

Use a component property for everything that's customizable. No override-hacking.

```
Boolean       -- show/hide elements (icon, label, badge)
Text          -- editable content (label, placeholder, count)
Instance swap -- replace one nested component (leading icon, avatar, status indicator)
Slot          -- a region that accepts any arranged content
Variant       -- switch component states and sizes
```

Expose only what needs customizing. Hide the rest.

## Slots

Slots are the pattern for flexible composition. One card with slots replaces twenty card variants for every content combination. A slot is a component property bound to a frame inside the component. In an instance, content gets added, removed, reordered, and resized inside it without detaching. Slots are on all plans, so they're the default. Instance swap is still right for a single-element swap.

Use slots for:
- Content regions inside cards (header, body, footer, media)
- Repeating items: rows in a list, tabs in a tab bar, actions in a toolbar
- Custom empty states
- Interchangeable lead and trail elements

How slots behave:
- A slot can't be the top-level layer of a component.
- Component properties can't be applied to layers inside a slot. Anything that needs its own properties goes in as a component instance.
- The slot's layout (position, flow, constraints) is set on the main component only.
- Set preferred instances on every slot. Turn on "only allow preferred instances" where the code component accepts a fixed set of children.
- Set minimum and maximum layer counts where the code has them. Figma warns past a limit but doesn't block. The limit documents intent. It doesn't enforce it.
- Removing a slot property resets that slot in every instance. Do it on a branch, not on a published library's main file.
- Name the slot property after the code prop it maps to (`leading`, `content`, `footer`).

## Interactive Components

Every stateful component is interactive. Not "should be." Is. A component page with static variants and no prototype connections is incomplete. Wire interactions while building the component, not after.

**Every component with more than one state has these prototype connections before it's done.** Button:

1. Default → `Mouse enter` → Change to Hover
2. Hover → `Mouse leave` → Change to Default
3. Hover → `Mouse down` → Change to Pressed
4. Pressed → `Mouse up` → Change to Hover

Any instance placed in a prototype frame inherits this. `While hovering` and `While pressing` are the shorter equivalent where a state doesn't chain into another.

Same mandatory wiring for:
- **Toggles / checkboxes**: `On click` → opposite checked state
- **Accordions**: `On click` → expanded, `On click` again → collapsed
- **Dropdown / select**: `On click` → open state
- **Navigation tabs**: `On click` → active variant
- **Form inputs**: `On click` → Focused. Figma has no focus or blur trigger, so the return to default is wired from whatever the flow does next.

Focused, Disabled, and Loading have no trigger. They're variants, set per instance. Don't move to the next component until interactions are wired.

## Variables in Prototypes

When a prototype needs logic beyond state transitions, use variables with prototype actions (paid plans). Boolean variables show or hide. Number variables drive counters and progress. String variables drive dynamic labels.

```
Example: cart item counter
- Number variable cartCount (default 0), bound to the count text layer
- "Add" click: set cartCount to cartCount + 1
- Conditional: if cartCount == 0, hide the checkout button
```

One frame and a few variable actions replace dozens of duplicate frames.

## Platform Variants

A platform-specific component is a variant of the base component, not a separate component. A Card has iOS, Android, and Web variants through the `Platform` property. They share token bindings and adapt their visual treatment to the platform.
