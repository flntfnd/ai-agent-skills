Supabase inside Next.js on Vercel. Cookie sessions through `@supabase/ssr`, the publishable key only, RLS as the security boundary. The secret key, key migration and JWT verification against the JWKS belong to Railway. They're in `backend-conventions/reference/supabase-admin-client.md`.

## Contents

- [Keys](#keys)
- [Client Setup](#client-setup)
- [Session Refresh](#session-refresh)
- [Checking the User](#checking-the-user)
- [Reading Data](#reading-data)
- [Caching and User Data](#caching-and-user-data)
- [Lane Rules in Code](#lane-rules-in-code)

## Keys

The publishable key (`sb_publishable_...`) is the browser and SSR key. It's the only key in this skill's code. The secret key (`sb_secret_...`) is the backend key. It lives on Railway and bypasses RLS.

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key grants nothing by itself. A request runs as the `anon` Postgres role before sign-in and as `authenticated` after, and RLS is what protects the data. Role names are permanent. They belong in policies (`to authenticated`), not in the names of keys or env vars.

A long key starting with `eyJ`, or an env var named after a role, means the project is on the legacy JWT keys. Supabase removes those at the end of 2026. The migration steps are in `backend-conventions/reference/supabase-admin-client.md`.

## Client Setup

```typescript
// lib/supabase/client.ts -- browser client (Client Components)
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
}
```

```typescript
// lib/supabase/server.ts -- Server Components, Server Functions, Route Handlers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet, _headers) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Called from a Server Component, which can't set cookies.
                        // Safe to ignore because proxy.ts refreshes the session.
                    }
                },
            },
        }
    );
}
```

One server client per request. It needs that request's cookies. Never hold one in a module-level variable.

## Session Refresh

Server Components can't write cookies. The proxy refreshes the token on the way in and writes it back on the way out.

```typescript
// proxy.ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
    return updateSession(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
    ],
};
```

```typescript
// lib/supabase/proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                    // Cache-Control, Expires, Pragma: stops a CDN from caching a
                    // response that carries one user's refreshed session.
                    Object.entries(headers).forEach(([key, value]) =>
                        supabaseResponse.headers.set(key, value)
                    );
                },
            },
        }
    );

    // Nothing runs between createServerClient and getClaims.
    const { data } = await supabase.auth.getClaims();

    const isPublic =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/auth");

    if (!data?.claims && !isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
```

What causes random sign-outs:

- Returning a different response object. Return `supabaseResponse`. If another is unavoidable, create it with `NextResponse.next({ request })` and copy the cookies and the `cache-control`, `expires` and `pragma` headers onto it.
- Running code between `createServerClient` and `getClaims()`.
- Refreshing the token in two places. Refresh tokens are single-use. A second refresh outside the short reuse window revokes the whole session.
- A Next.js older than 16, which never calls `proxy.ts`. Check the version before assuming the refresh runs.

The second `setAll` argument needs a current `@supabase/ssr`. Upgrade the package. Don't guard for its absence. The redirect is a convenience, not the authorization check (`nextjs.md`, proxy.ts).

## Checking the User

- **`getClaims()`** verifies the JWT signature on every call and returns its claims. With asymmetric signing keys, the default for new projects, it verifies locally against the cached JWKS. On a symmetric-secret project it calls the Auth server. This is the default check for pages, data and Server Functions.
- **`getUser()`** always calls the Auth server and returns the current user record. Use it when the full record is needed, or when an action is sensitive enough that a just-banned or just-signed-out user has to be refused before their access token expires.
- **`getSession()`** reads the cookie without verifying it. Anyone can forge that cookie. Never authorize with it, or with the user object it returns, on the server.

## Reading Data

```tsx
// app/items/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function ItemsPage() {
    return (
        <Suspense fallback={<ItemListSkeleton />}>
            <Items />
        </Suspense>
    );
}

async function Items() {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) redirect("/login");

    // RLS scopes this to the rows the policy allows for auth.uid()
    const { data: items, error } = await supabase
        .from("items")
        .select("id, title, created_at")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return <ItemList items={items} />;
}
```

`createClient()` reads cookies, which makes the component dynamic. With Cache Components it sits inside `<Suspense>`. Select the columns the UI needs, not `*`.

Writes follow the Server Function in `nextjs.md`: `getClaims()` first, validate, write, then `updateTag`. Return a message written for the user, not `error.message`. That can expose table, column and policy names. The `with check` clause of the insert policy is what stops a forged `user_id`.

## Caching and User Data

RLS runs when the query runs. A cached result is replayed to whoever asks for the same cache key, with no policy check.

- Never read RLS-protected, per-user data inside a shared `"use cache"` scope. Passing a user id in as an argument puts one user's rows in a server cache that only that argument protects.
- Leave per-user reads uncached inside `<Suspense>`. If one is slow enough to need caching, use `"use cache: private"`. It caches in that user's browser only.
- Shared `"use cache"` is for data that's the same for everyone and readable with no session, like a public catalog.
- A response carrying a refreshed session can't be cached by a CDN. Applying the headers passed to `setAll` handles this.

## Lane Rules in Code

**The secret key never reaches Vercel.** It bypasses RLS. If a query needs it, the query goes through a Railway endpoint, not a Server Function. That endpoint's client setup and how it verifies the caller's JWT are in `backend-conventions/reference/supabase-admin-client.md`.

**No elevated key ever carries the `NEXT_PUBLIC_` prefix.** That prefix compiles a variable into the browser bundle. Only the URL and the publishable key get it.

**No plain `@supabase/supabase-js` client in server code on Vercel.** It has no cookie session and no refresh. Use `createServerClient` from `@supabase/ssr`, per request.

**RLS is the security layer.** The server client carries the user's session and Postgres enforces policies through `auth.uid()`. Don't rebuild authorization in application code on top of it. The copy drifts from the real policy. Narrowing a query to what the screen needs (`.eq`, `.order`, `.limit`) is ordinary querying. Write policies as `(select auth.uid()) = user_id`, name the role (`to authenticated`), and index every column a policy filters on.

**Supabase Auth is the auth layer.** No custom JWTs. No session logic beside `@supabase/ssr`.
