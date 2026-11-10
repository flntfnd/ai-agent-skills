# Interaction & Accessibility

## Contents
- [Ripple and State Layers](#ripple-and-state-layers)
- [Haptics](#haptics)
- [Touch Targets](#touch-targets)
- [Semantics](#semantics)
- [Contrast](#contrast)
- [Text Scaling](#text-scaling)

## Ripple and State Layers

Material shows interaction state as a translucent layer of the content color over the component: 8% hovered, 10% focused, 10% pressed. In Compose the ripple draws it. `clickable`, `selectable`, `toggleable`, and every M3 component get it inside a Material theme with no code. Leave it alone unless the design specifies another indication.

To change it for one element, pass `ripple()` from `androidx.compose.material3`. `rememberRipple()` is deprecated and current Material components don't use it.

```kotlin
Box(
    modifier = Modifier
        .clip(MaterialTheme.shapes.medium)       // clip first so the ripple follows the shape
        .clickable(
            interactionSource = null,
            indication = ripple(color = MaterialTheme.colorScheme.tertiary),
            onClick = onOpen
        )
)
```

A custom component that draws its own pressed state (shape morph, scale) keeps the ripple too, or supplies a custom `IndicationNodeFactory`. Never `indication = null` with nothing in its place.

## Haptics

Haptics confirm an outcome or mark a threshold. They aren't decoration, and they never fire on every tap. Use the semantic type. The system maps it to the right effect for the device and respects the user's haptics setting.

| Moment | `HapticFeedbackType` |
| --- | --- |
| Long-press recognized, drag picked up | `LongPress` |
| Action succeeded (save, send, payment) | `Confirm` |
| Action refused or failed validation | `Reject` |
| Switch or toggle changed | `ToggleOn` / `ToggleOff` |
| Slider or picker crossing a step | `SegmentTick` (`SegmentFrequentTick` for dense steps) |
| Drag crossed a commit threshold | `GestureThresholdActivate` |
| Gesture released and settled | `GestureEnd` |
| Text selection handle moved | `TextHandleMove` |

```kotlin
val haptic = LocalHapticFeedback.current
haptic.performHapticFeedback(HapticFeedbackType.Confirm)
```

Before adding a haptic to a stock M3 component, check on a device whether it already fires one.

## Touch Targets

At least 48 × 48dp (about 9mm), whatever the visual size. A 24dp icon carries 12dp of padding on each side. M3 components enforce it. Custom components use `Modifier.minimumInteractiveComponentSize()`, which expands the touch area without changing the visual.

## Semantics

Stock components fill in the accessibility tree. Custom ones have to state it.

```kotlin
// What it is and what state it is in
Modifier.toggleable(value = checked, role = Role.Switch, onValueChange = onCheckedChange)

// A row read as one item with one action
Modifier
    .clickable(onClickLabel = "Open thread", onClick = onOpen)
    .semantics(mergeDescendants = true) { }

// Section titles, so screen reader users can jump between them
Modifier.semantics { heading() }
```

- Use `clickable`, `toggleable`, and `selectable`, not raw pointer input. They supply role, state, focus, keyboard, and ripple together.
- Icons that carry meaning get a `contentDescription`. Decorative icons, and icons beside a label that says the same thing, get `null`.
- State goes in `stateDescription`, not in a rewritten label. Content that changes without user action is a `liveRegion`.
- Navigation destinations always keep their text labels.
- Everything interactive is reachable by keyboard. On tablets, foldables, and desktop windows a hardware keyboard is normal input.
- For custom components, assert semantics in tests (`assertIsToggleable`, `assertHasClickAction`). Screenshots don't catch these regressions.

## Contrast

| Content | Minimum against its background |
| --- | --- |
| Body text | 4.5:1 |
| Large text (18sp regular or 14sp bold and up), icons, graphics | 3:1 |
| Component containers and boundaries needed to identify a control | 3:1 |

M3 role pairs (`onPrimary` on `primary`, `onSurface` on `surface`) meet these in every scheme, dynamic color included. Hardcoded colors and mismatched pairs don't. That's the practical reason for the no-hardcoded-color rule. User-selected contrast levels are in theme-and-color.md.

## Text Scaling

Let the user's font size setting work. `heightIn(min = ...)`, not fixed heights, on anything holding text. Wrap, don't truncate, unless the full text is available elsewhere. Test at the largest font and display size on a compact window.
