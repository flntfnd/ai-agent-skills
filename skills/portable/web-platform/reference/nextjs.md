Next.js App Router on Vercel. Versions are in the snapshot table in `SKILL.md`. The parts that are easy to get wrong: explicit caching through Cache Components, `proxy.ts`, async-only request APIs, and the revalidation APIs.

Next.js ships version-matched docs inside the package (`node_modules/next/dist/docs/`). If a project is on a different minor than the snapshot, those docs win over this file.

## Contents

- [Components and Routing](#components-and-routing)
- [Cache Components](#cache-components)
- [Projects Without Cache Components](#projects-without-cache-components)
- [proxy.ts](#proxyts)
- [Async Request APIs](#async-request-apis)
- [Server Functions](#server-functions)
- [Revalidation](#revalidation)
- [Navigation and Prefetching](#navigation-and-prefetching)
- [React Features](#react-features)
- [Images and Fonts](#images-and-fonts)
- [Tooling](#tooling)

## Components and Routing

- Server Components are the default and ship no JavaScript. Add `"use client"` only for state, effects, event handlers or browser APIs, and keep those components at the leaves. A Client Component can't import a Server Component. It can receive one as `children`.
- `proxy.ts` sits at the project root (or in `src/`), beside `app/`.
- Every parallel route slot (`@modal/`) needs a `default.tsx` or the build fails. Return `null` or call `notFound()`.
- `error.tsx`, `global-error.tsx`, `not-found.tsx` and `loading.tsx` are in `error-handling.md`.

## Cache Components

Cache Components is the caching model. Nothing is cached implicitly. Every component is one of three things:

1. **Static**: synchronous work, imports, pure computation. Prerendered into the static shell automatically.
2. **Cached**: marked `"use cache"`. Prerendered into the shell and reused for its `cacheLife`.
3. **Dynamic**: reads uncached or request data. Sits inside `<Suspense>`. The fallback goes in the shell and the content streams.

One page mixes all three in one response. An uncached read outside `<Suspense>` is a dev-overlay error, not a silently slow page.

Enable both flags. Partial Prefetching is part of the model, and leaving it unset logs a warning:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,
};

export default nextConfig;
```

```tsx
// app/blog/page.tsx
import { Suspense } from "react";
import { cookies } from "next/headers";
import { cacheLife, cacheTag } from "next/cache";

export default function BlogPage() {
    return (
        <>
            <h1>Blog</h1>
            <Posts />
            <Suspense fallback={<p>Loading preferences</p>}>
                <Preferences />
            </Suspense>
        </>
    );
}

// Cached: in the shell, shared by everyone
async function Posts() {
    "use cache";
    cacheLife("hours");
    cacheTag("posts");
    const posts = await getPosts();
    return <PostList posts={posts} />;
}

// Dynamic: reads the request, streams in
async function Preferences() {
    const theme = (await cookies()).get("theme")?.value ?? "light";
    return <p>Theme: {theme}</p>;
}
```

The rules that follow from it:

- Pair every `"use cache"` with a `cacheLife`: `"seconds"`, `"minutes"`, `"hours"`, `"days"`, `"weeks"`, `"max"`, or an object with `stale`, `revalidate`, `expire`.
- Arguments and closed-over values are the cache key.
- A cached scope can't read `cookies()`, `headers()` or `searchParams`. Read them in an uncached parent and pass the value in. Or use `"use cache: private"`, which caches per browser and never in the shared server cache.
- The default server cache is in-memory per instance. On serverless it rarely survives between requests. `"use cache: remote"` uses a shared cache handler at the cost of a network round trip. Use it only where the hit rate is high.
- `Math.random()`, `Date.now()` and `crypto.randomUUID()` go inside `"use cache"` (one value for everyone) or after `await connection()` from `next/server` inside `<Suspense>` (one value per request).
- Push async reads down. A layout that awaits `params` at the top can't be prerendered. Pass the promise to a child inside `<Suspense>`.
- `export const ensureStatic = "navigation"` on a page or layout fails the build if anything dynamic gets in. Use it on marketing and content routes that have to stay static.

Never put per-user, RLS-protected data in a shared `"use cache"` scope. See `supabase-integration.md`.

## Projects Without Cache Components

An existing project may not have the flag on. There, `fetch()` is uncached unless asked (`cache: "force-cache"` or `next: { revalidate: 60 }`), and route segment config (`export const dynamic`, `revalidate`, `fetchCache`) controls rendering. Turning Cache Components on replaces those configs with `"use cache"` and `cacheLife`, and raises an error for every uncached read outside `<Suspense>`. That's a migration, with its own guide in the bundled docs. Don't turn it on as a side effect of another task.

## proxy.ts

Request interception is `proxy.ts`, exporting `proxy`. It always runs on the Node.js runtime, and setting `runtime` in it throws. If you find a `middleware.ts`, it's the old name for the same file. Rename the file and the export.

```ts
// proxy.ts
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    if (request.nextUrl.pathname === "/old") {
        return NextResponse.redirect(new URL("/new", request.url));
    }
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
```

Without a `matcher` it runs on every request, static assets included. Matcher values are constants.

Proxy is for redirects, rewrites, headers and refreshing the Supabase session cookie. It's not the authorization layer. Server Functions are POST requests to the route that uses them, so a matcher that skips a path skips its Server Functions too. A refactor can silently remove coverage. Check auth again where data is read or written.

## Async Request APIs

`cookies()`, `headers()`, `draftMode()`, `params` and `searchParams` are promises. There's no synchronous access.

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<"/blog/[slug]">) {
    const { slug } = await props.params;
    const { q } = await props.searchParams;
    return <h1>{slug} {q}</h1>;
}
```

`PageProps`, `LayoutProps` and `RouteContext` are global helpers generated by `next dev`, `next build` or `npx next typegen`. They're typed per route, so they only exist for routes the project has.

## Server Functions

A Server Function is an async function marked `"use server"` that the client calls over the network. Used as a form `action`, it's a Server Action. They replace hand-written API routes for mutations.

They're reachable by direct POST, not only through the UI. Every one verifies the user and validates its input.

```ts
// app/posts/actions.ts
"use server";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error: string } | null;

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return { error: "Not signed in" };

    const title = formData.get("title");
    if (typeof title !== "string" || !title.trim()) return { error: "Title is required" };

    const { error } = await supabase
        .from("posts")
        .insert({ title: title.trim(), user_id: data.claims.sub });
    if (error) return { error: "Could not save the post" };

    updateTag("posts");
    redirect("/posts");
}
```

The client side (`useActionState`, result types, what to return and what to throw) is in `error-handling.md`. `redirect()` works by throwing. Call it last, and never inside a `try` that would swallow it.

## Revalidation

| API | Callable from | Semantics | Use for |
| --- | --- | --- | --- |
| `updateTag(tag)` | Server Actions only | Expires the tag now. The same request renders fresh data | The user just changed something and has to see it |
| `revalidateTag(tag, profile)` | Server Actions and Route Handlers | Stale-while-revalidate. The profile sets how long stale content may be served | Content that tolerates a short delay, CMS webhooks |
| `revalidatePath(path)` | Server Actions and Route Handlers | Invalidates everything for a route | When the tags aren't known. Prefer tags |
| `refresh()` | Server Actions only | Refreshes the client router. Doesn't touch tagged cache entries | Uncached data elsewhere on the page, like a badge count |

```ts
"use server";
import { refresh, revalidateTag, updateTag } from "next/cache";

export async function publishPost(id: string) {
    await savePost(id);
    revalidateTag("posts", "max");
}

export async function updateProfile(userId: string, name: string) {
    await saveProfile(userId, name);
    updateTag(`user-${userId}`);
}

export async function markNotificationRead(id: string) {
    await markRead(id);
    refresh();
}
```

The one-argument `revalidateTag("tag")` is a type error.

## Navigation and Prefetching

With Partial Prefetching the router prefetches each route's shell (static content plus `<Suspense>` fallbacks), so a click always has something to show. `<Link prefetch>` also prefetches cached content that depends on the link's URL. That costs a server invocation per visible link.

- Give every dynamic region a real loading state through `<Suspense>`. The Instant Insights panel in the dev overlay lists navigations that would block.
- When `<Link prefetch>` would pull heavy data for links nobody opens, defer that part. `await navigation()` from `next/cache` inside the component keeps its content out of prefetches until the user navigates.

## React Features

- **`<ViewTransition>`** from `react` animates enter, exit, update and shared-element changes inside a transition, a `<Suspense>` reveal or a navigation. No Next.js flag. Motion values and CSS come from `motion-design`.
- **`use(browser())`** from `react-dom` suspends on the server and resolves on the client. It replaces `typeof window` checks and "mounted" state.
- **Context from a Server Component**: render `<SomeContext value={value}>` directly when the context is created in a `"use client"` module. No provider wrapper component.
- **`<Activity mode="hidden">`** keeps state for UI that's temporarily hidden, like tabs.
- **React Compiler**: `reactCompiler: true` plus the `babel-plugin-react-compiler` dev dependency. Off by default. With it on, don't hand-write `useMemo`/`useCallback` for render performance.

## Images and Fonts

```tsx
import Image from "next/image";

export function Hero() {
    return (
        <Image
            src="/hero.jpg"
            alt="Hero description"
            width={1200}
            height={600}
            fetchPriority="high"
            loading="eager"
            sizes="(max-width: 48rem) 100vw, 50vw"
        />
    );
}
```

Don't use `priority`. The LCP image gets `fetchPriority="high"` with `loading="eager"`, or `preload` when it has to be discovered before the body is parsed. Defaults that bite: `images.qualities` allows only `[75]` unless configured, local images with query strings need `images.localPatterns`, and remote hosts go in `images.remotePatterns`, not `images.domains`.

```tsx
// app/layout.tsx
import type { ReactNode } from "react";
import localFont from "next/font/local";

const sans = localFont({
    src: "./fonts/Sans-Variable.woff2",
    variable: "--typography-family-sans",
    display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={sans.variable}>
            <body>{children}</body>
        </html>
    );
}
```

`next/font` self-hosts the files, so nothing is requested from a third-party font host. It generates a size-adjusted fallback so the swap doesn't shift layout. The `variable` name is the typography token.

## Tooling

- `next lint` is gone and `next build` doesn't lint. Run ESLint (flat config) or Biome directly.
- `npx next analyze` opens the Turbopack bundle analyzer.
- `next build` type-checks with whatever `typescript` version the project installs.
- `npx @next/codemod@canary upgrade latest` handles version migrations. Individual codemods include `middleware-to-proxy` and `next-async-request-api`.
