## Contents

- [Two Kinds of Error](#two-kinds-of-error)
- [Route Error Boundaries](#route-error-boundaries)
- [Component Boundaries](#component-boundaries)
- [Server Function Results](#server-function-results)
- [Loading States](#loading-states)

## Two Kinds of Error

- **Expected**: validation failures, "not signed in", a missing row. Return them as values and render them in place.
- **Unexpected**: bugs and outages. Throw, and let an error boundary show fallback UI.

Throwing for a validation failure blanks a form the user was filling in. Swallowing a real failure into a return value hides a bug.

## Route Error Boundaries

`error.tsx` wraps its route segment in an error boundary. Put one at the app root so nothing is unhandled. Add more only where a failure should be contained to part of the UI.

```tsx
// app/dashboard/error.tsx
"use client";
import { useEffect } from "react";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
    useEffect(() => {
        // Report to error tracking here. For server errors, error.digest matches
        // the server log entry. No PII: no form values, no user records.
        console.error(error);
    }, [error]);

    return (
        <div role="alert">
            <h2>Something went wrong</h2>
            <button onClick={() => retry()}>Try again</button>
        </div>
    );
}
```

- `error` is `unknown`. A value thrown in a Client Component may not be an `Error`. Narrow before reading `message`.
- In production, errors from Server Components arrive with a generic message and a `digest`. The real message stays on the server.
- `retry()` re-fetches and re-renders the segment, Server Components included. `reset()` still exists and only clears the error state without re-fetching. Use `retry`.
- `error.tsx` doesn't catch errors in the `layout.tsx` of its own segment. `app/global-error.tsx` catches the root layout. It replaces that layout, so it renders its own `<html>` and `<body>` and gets none of the app's global styles.
- `notFound()` from `next/navigation` renders the nearest `not-found.tsx`.

## Component Boundaries

For a boundary that isn't tied to a route segment, use `catchError` from `next/error`. Unlike a hand-written class boundary, it doesn't intercept `notFound()` or `redirect()`, and it gets the same `retry()`.

```tsx
// app/ui/panel-boundary.tsx
"use client";
import { catchError, type ErrorInfo } from "next/error";

function PanelFallback(props: { title: string }, { retry }: ErrorInfo) {
    return (
        <div role="alert">
            <h3>{props.title} is unavailable</h3>
            <button onClick={() => retry()}>Try again</button>
        </div>
    );
}

export const PanelBoundary = catchError(PanelFallback);
```

Wrap the region: `<PanelBoundary title="Recent activity">...</PanelBoundary>`.

Boundaries catch errors thrown while rendering. They don't catch errors in event handlers or in async code that runs after render. Catch those where they happen and put the failure in state. An error thrown inside `startTransition` does reach the nearest boundary.

Outside Next.js (a React island on an Astro site), the class component with `getDerivedStateFromError` is still React's only error boundary.

## Server Function Results

Model expected failures as a return type and pass the function straight to `useActionState`. Its first parameter is the previous state.

```typescript
// app/items/actions.ts
"use server";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

export type Item = { id: string; title: string };

export async function createItem(
    _prev: ActionResult<Item> | null,
    formData: FormData
): Promise<ActionResult<Item>> {
    const supabase = await createClient();

    const { data: auth } = await supabase.auth.getClaims();
    if (!auth?.claims) return { ok: false, error: "Not signed in" };

    const title = formData.get("title");
    if (typeof title !== "string" || !title.trim()) {
        return { ok: false, error: "Title is required" };
    }

    const { data, error } = await supabase
        .from("items")
        .insert({ title: title.trim(), user_id: auth.claims.sub })
        .select("id, title")
        .single();

    if (error) return { ok: false, error: "Could not save the item" };

    updateTag("items");
    return { ok: true, data };
}
```

```tsx
// app/items/create-item-form.tsx
"use client";
import { useActionState } from "react";
import { createItem } from "./actions";

export function CreateItemForm() {
    const [state, formAction, pending] = useActionState(createItem, null);
    const error = state && !state.ok ? state.error : null;

    return (
        <form action={formAction}>
            <label htmlFor="title">Title</label>
            <input
                id="title"
                name="title"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "title-error" : undefined}
            />
            {error && <p id="title-error" role="alert">{error}</p>}
            <button disabled={pending}>{pending ? "Creating" : "Create"}</button>
        </form>
    );
}
```

`redirect()` and `notFound()` work by throwing. Never call them inside a `try` block that would swallow them.

## Loading States

The closer a `<Suspense>` boundary sits to the data, the more of the page renders immediately. `loading.tsx` wraps a whole segment in one boundary. Fine when the entire page depends on one read, wasteful when only one region does. With Cache Components, an uncached read with no `<Suspense>` above it is flagged in the dev overlay. Size skeletons to the final content so the swap doesn't shift layout.
