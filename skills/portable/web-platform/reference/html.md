Markup rules, and the native elements that replace JavaScript. Support status is in `browser-compatibility.md`.

## Contents

- [Document Rules](#document-rules)
- [Images](#images)
- [Forms](#forms)
- [Dialog](#dialog)
- [Popover](#popover)
- [Invoker Commands](#invoker-commands)
- [Other Native Widgets](#other-native-widgets)

## Document Rules

- `<html lang>` is required. The viewport meta is exactly `width=device-width, initial-scale=1`. Never `user-scalable=no` or `maximum-scale=1` (WCAG 1.4.4).
- If it does something, it's a `<button>`. If it goes somewhere, it's an `<a href>`. A `<div>` with a click handler has no role, no focus and no keyboard behavior.
- One `<main>`. Headings in order. A skip link as the first focusable element. An `aria-label` on each `<nav>` when there's more than one.
- I self-host fonts. A `preconnect` or stylesheet link to a third-party font host is a third-party request on every page view. That needs to be documented in the codebase before it ships.
- In Next.js and Astro the framework writes `<head>`. Use the Metadata API or the layout's head slot, not hand-written tags.
- Write well-formed markup. Close every non-void tag and nest correctly. Astro's compiler doesn't repair it (`astro.md`).

## Images

```html
<!-- Below the fold -->
<img
    src="/image-800.avif"
    srcset="/image-400.avif 400w, /image-800.avif 800w, /image-1200.avif 1200w"
    sizes="(max-width: 40rem) 100vw, 50vw"
    alt="What the image shows"
    width="800"
    height="400"
    loading="lazy"
/>

<!-- LCP image: eager, high priority, never lazy -->
<img src="/hero.avif" alt="What the hero shows" width="1200" height="600" fetchpriority="high" />

<!-- Decorative -->
<img src="/decoration.svg" alt="" />
```

- `width` and `height`, always. The aspect ratio is reserved before the file loads.
- AVIF by default. WebP where a pipeline can't produce AVIF. Both work in every current browser, so no JPEG fallback `<source>`.
- The LCP image doesn't need a `<link rel="preload">` when it's in the HTML. `fetchpriority="high"` is enough.
- In frameworks use the image component (`next/image`, `astro:assets`). It generates `srcset`, format and dimensions.

## Forms

```html
<form method="post" action="/subscribe">
    <div class="field">
        <label for="email">Email address</label>
        <input
            type="email"
            id="email"
            name="email"
            autocomplete="email"
            required
            aria-describedby="email-hint email-error"
        />
        <p id="email-hint" class="hint">Used only to send the receipt.</p>
        <p id="email-error" class="error" role="alert"></p>
    </div>

    <button type="submit">Subscribe</button>
</form>
```

- Every input has a `<label>` tied by `for`/`id`. Placeholder text is not a label.
- `required` already exposes the required state. `aria-required` beside it is redundant.
- `role="alert"` on the error container announces text when it's inserted. Don't add `aria-live="polite"` to it. The two contradict. `aria-invalid="true"` goes on the input only while it's invalid.
- `type`, `inputmode` and `autocomplete` choose the mobile keyboard and enable autofill. `autocomplete` on personal-data fields is also a WCAG requirement (1.3.5).
- Style validation with `:user-invalid`. Add `novalidate` only when custom validation UI fully replaces the native bubbles.
- Validate on the server, always.

## Dialog

```html
<dialog id="confirm-delete" aria-labelledby="confirm-title">
    <form method="dialog">
        <h2 id="confirm-title">Delete this item?</h2>
        <button value="cancel">Cancel</button>
        <button value="delete">Delete</button>
    </form>
</dialog>
```

```javascript
const dialog = document.getElementById("confirm-delete");
dialog.showModal();
dialog.addEventListener("close", () => {
    if (dialog.returnValue === "delete") deleteItem();
});
```

`showModal()` gives the top layer, a `::backdrop`, Escape to close, focus moved in and restored, and everything outside made inert. Don't write a focus trap. Don't add a scroll lock library. `<form method="dialog">` closes the dialog and sets `returnValue` to the submitting button's `value`.

Closing on backdrop click is `closedby="any"`. Until it's in every browser, use a click handler that closes when the event target is the dialog element itself.

## Popover

```html
<button popovertarget="account-menu">Account</button>
<div id="account-menu" popover>
    <a href="/settings">Settings</a>
    <a href="/logout">Log out</a>
</div>
```

`popover` gives the top layer and light dismiss with no JavaScript. It doesn't trap focus or make the page inert. That's the difference from a modal dialog. `popover="manual"` turns off light dismiss, for toasts.

It gives behavior, not semantics. A menu still needs roles and arrow-key handling. A tooltip still needs `aria-describedby`. Tether it to its trigger with anchor positioning (`css.md`).

## Invoker Commands

Declarative button behavior. It replaces one-line click handlers:

```html
<button commandfor="confirm-delete" command="show-modal">Delete</button>
<button commandfor="confirm-delete" command="close">Cancel</button>
<button commandfor="account-menu" command="toggle-popover">Account</button>
```

Built-in commands: `show-modal`, `close`, `request-close`, `show-popover`, `hide-popover`, `toggle-popover`. A value starting with `--` is a custom command, delivered as a `command` event on the target. Until it's widely available, a page whose dialogs can't open without it keeps the `showModal()` call as the fallback.

## Other Native Widgets

- **Accordion**: `<details name="faq">`. Details elements sharing a `name` close each other.
- **`inert`** removes a subtree from focus order and the accessibility tree. Use it on off-screen panels and content behind a custom overlay.
- **Customizable `<select>`**: `appearance: base-select` on the select and its `::picker(select)` allows full styling of a real select. Limited availability, and it falls back to the native control. Adopt it as an enhancement. Don't build a custom listbox.

Reach for a custom ARIA widget only after confirming no native element does the job (`accessibility.md`).
