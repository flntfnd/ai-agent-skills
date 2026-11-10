## Contents

- [WCAG 2.2 Level AA](#wcag-22-level-aa)
- [Contrast](#contrast)
- [Keyboard and Focus](#keyboard-and-focus)
- [ARIA](#aria)
- [Form Errors](#form-errors)
- [User Preferences](#user-preferences)
- [Testing](#testing)

## WCAG 2.2 Level AA

Build to WCAG 2.2 AA. It's the current W3C Recommendation and a superset. Meeting it also meets 2.1 AA and 2.0 AA, which are the versions most laws still name: the European Accessibility Act (through EN 301 549) and the US ADA Title II rule name 2.1 AA, Section 508 names 2.0 AA. WCAG 3 is a working draft. Don't build to it.

The criteria 2.2 added are the ones that get missed:

| Criterion | Level | What it requires |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | AA | A focused element isn't entirely hidden by sticky headers, footers or overlays |
| 2.5.7 Dragging Movements | AA | Anything done by dragging can also be done with single taps |
| 2.5.8 Target Size (Minimum) | AA | Pointer targets are at least 24 by 24 CSS px, or have equivalent spacing |
| 3.2.6 Consistent Help | A | Help appears in the same relative place on every page |
| 3.3.7 Redundant Entry | A | Don't ask for the same information twice in one process |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive test to log in. Allow paste and password managers, and offer an alternative to any puzzle CAPTCHA |

AAA additions: 2.4.12 Focus Not Obscured (Enhanced), 2.4.13 Focus Appearance, 3.3.9 Accessible Authentication (Enhanced). 4.1.1 Parsing was removed in 2.2. Don't cite it.

## Contrast

| Content | Minimum ratio |
| --- | --- |
| Body text | 4.5:1 |
| Large text (24px and up, or 18.66px bold and up) | 3:1 |
| UI component boundaries, icons, focus indicators | 3:1 against adjacent colors |

WCAG contrast is computed from relative luminance, not oklch lightness. A large oklch `L` difference usually passes. Check the actual ratio anyway. `color-system` has the math.

Color is never the only signal. An error needs text or an icon as well as red. A link inside body text needs an underline or another non-color cue.

## Keyboard and Focus

```css
:focus-visible {
    outline: 2px solid var(--color-semantic-border-focus);
    outline-offset: 2px;
}

/* 2.4.11: keep focused elements out from under a sticky header */
html {
    scroll-padding-block-start: var(--size-header-height);
}
```

- Browsers already show focus rings only for keyboard focus. There's nothing to suppress for mouse users. Restyle `:focus-visible`. Never remove the outline without a replacement (WCAG 2.4.7).
- Native `<dialog>` with `showModal()` handles focus trapping and restoration. Don't write a focus trap.
- After a client-side route change, focus moves to the new page's heading or main region. Next.js and Astro's client router handle the announcement. Check it. Don't assume.
- A positive `tabindex` is always wrong.

## ARIA

Native HTML first. ARIA changes what assistive technology is told and adds no behavior. Every role you add is keyboard handling you now owe.

- Icon-only buttons need `aria-label`. The icon gets `aria-hidden="true"`.
- State lives on the control: `aria-expanded` and `aria-controls` on the button, `hidden` on the panel.
- `role="status"` is polite and `role="alert"` interrupts. Use `alert` for errors that need action and `status` for everything else. The container exists first and the text is inserted later. Don't add `aria-live` on top of either role.
- `aria-hidden="true"` on a focusable element, or an ancestor of one, hides something the keyboard can still reach. Use `inert` to remove a subtree from both.
- For widgets with no native equivalent (combobox, tabs, tree), follow the ARIA Authoring Practices Guide pattern exactly, keyboard model included. A half-built combobox is worse than a native `<select>`.

## Form Errors

The markup is in `html.md`. The rules:

- `aria-describedby` goes on the input and points at the hint and the error. `aria-invalid` is set only while the field is invalid.
- Error text says what's wrong and how to fix it (3.3.1, 3.3.3). "Invalid input" does neither.
- On submit with several errors, move focus to the first invalid field, or to an error summary that links to each one.
- Mark required fields in the label text, not only with an asterisk or color.
- Every radio group is a `<fieldset>` with a `<legend>`.
- Don't disable the submit button to signal invalid input. A disabled button can't explain what's missing.

## User Preferences

```css
@media (prefers-contrast: more) {
    :root { --color-semantic-border-default: var(--color-semantic-text-primary); }
}

@media (forced-colors: active) {
    /* Backgrounds and shadows are dropped, borders survive */
    .button { border: 1px solid ButtonText; }
}

@media (prefers-reduced-transparency: reduce) {
    .glass { backdrop-filter: none; background: var(--color-semantic-background-elevated); }
}
```

- Write motion inside `@media (prefers-reduced-motion: no-preference)`, so the reduced experience is the default. Reduced motion removes movement and keeps feedback. Swap slides and parallax for a fade, or nothing.
- Anything that moves or auto-updates for more than five seconds needs a pause control (2.2.2). Nothing flashes more than three times a second (2.3.1).
- Text survives 200% zoom. The layout reflows at 320 CSS px wide with no horizontal scroll (1.4.4, 1.4.10).
- If a meaning has to survive forced colors, don't carry it with a shadow or background alone.

## Testing

Automated checks find only the mechanical failures: missing names, contrast, invalid ARIA. They can't judge whether alt text is right, focus order makes sense, or a flow is usable.

- **axe** (`@axe-core/playwright` in end-to-end tests, or the DevTools extension) on every page. Lighthouse runs a subset of it.
- Then on every critical flow: keyboard only, one screen reader pass, 200% zoom, reduced motion on.
- Screen readers to test with: NVDA or JAWS with Chrome or Firefox (together the large majority of desktop use), VoiceOver with Safari on macOS and iOS, TalkBack with Chrome on Android.
