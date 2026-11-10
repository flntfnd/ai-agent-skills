---
name: web-platform
description: "Web frontend reference for a Next.js on Vercel, Astro, and Supabase stack. Covers semantic HTML (dialog, popover, invoker commands, forms), custom CSS (cascade layers, oklch tokens, container and style queries, :has(), @scope, anchor positioning), TypeScript (strict tsconfig, Temporal), the Next.js App Router (Server Components, Cache Components and \"use cache\", proxy.ts, Server Functions, revalidation), Astro (islands, content collections, server islands), Supabase through @supabase/ssr (publishable key, RLS, getClaims), WCAG 2.2 AA accessibility, mobile web and PWA, Core Web Vitals, security headers and CSP, Baseline browser support status, and visual techniques (blend modes, clip-path, filters, SVG, Canvas 2D). Use when building, reviewing, or debugging web pages, components, forms, layouts, routing, auth flows, or caching, when fixing performance, accessibility, or cross-browser problems, and when deciding whether a web platform feature is safe to ship."
---

# Web Platform

How I build for the web: browser-native HTML, CSS and JS, the Next.js App Router, Astro, and Supabase auth. Plus the accessibility, performance, security and visual details that separate hand-built work from component-library output.

Evergreen browsers only. No legacy prefixes. No polyfills for anything above 95% support. Mobile-first: build for a mid-range Android phone on a cell network, not a desktop monitor.

JavaScript causes most performance problems. Load less of it. Move logic to the server. If CSS or HTML can do it, that's where it goes.

## Reference Files

Load the one or two files the task needs. Not the whole set.

| Topic | File |
| --- | --- |
| Markup rules, images, forms, dialog, popover, invoker commands | [reference/html.md](reference/html.md) |
| Layers, tokens, oklch, `@scope`, container and style queries, `:has()`, fluid type, anchor positioning, web motion rules | [reference/css.md](reference/css.md) |
| Built-ins, Temporal, tsconfig, TypeScript rules | [reference/javascript-typescript.md](reference/javascript-typescript.md) |
| Cache Components and `"use cache"`, `proxy.ts`, async request APIs, Server Functions, revalidation, prefetching, images, fonts | [reference/nextjs.md](reference/nextjs.md) |
| Astro compiler rules, islands, content collections, server islands | [reference/astro.md](reference/astro.md) |
| `@supabase/ssr` clients, session refresh in `proxy.ts`, `getClaims()` vs `getUser()`, key naming, lane rules in code | [reference/supabase-integration.md](reference/supabase-integration.md) |
| Error boundaries, `retry`, Server Function result types, loading states | [reference/error-handling.md](reference/error-handling.md) |
| WCAG 2.2 AA, contrast, focus, ARIA, form errors, user preferences, testing | [reference/accessibility.md](reference/accessibility.md) |
| Touch targets, safe areas, pointer input, PWA | [reference/mobile-web.md](reference/mobile-web.md) |
| Security headers, CSP, input validation, Core Web Vitals, bundles | [reference/security-performance.md](reference/security-performance.md) |
| Blend modes, clip-path, filters, custom cursor, SVG, Canvas 2D | [reference/advanced-visual-techniques.md](reference/advanced-visual-techniques.md) |
| Baseline status of every web feature the skills name, support policy, fallbacks | [reference/browser-compatibility.md](reference/browser-compatibility.md) |

Other skills own the rest. Motion tokens and CSS motion technique: `motion-design`. Palette values: `color-system`. Token names: `figma-design-system` (`reference/token-architecture.md`). Style languages: `visual-styles`. Anything on Railway, including the Supabase secret key and JWT verification: `backend-conventions`. Keystatic on Astro sites: `site-content-editing`.

## Version Snapshot

As of November 2026. Version numbers live in this table and nowhere else. Support status lives in `reference/browser-compatibility.md` and nowhere else. If that date is more than a few months old, run `npm view <package> version` and read the release blog before trusting it.

| Package | Current | Notes |
| --- | --- | --- |
| Next.js | 16.4 (16.x is Active LTS) | Cache Components is the recommended model and becomes the default in 17 |
| React | 19.3 | `<ViewTransition>` is stable |
| Astro | 7.4 | Rust compiler, Vite 8, Node 22+ |
| TypeScript | 7.0 | Native compiler. `strict` is on by default |
| `@supabase/ssr` | 0.12 | `setAll` receives cache headers as a second argument |
| `@supabase/supabase-js` | 2.x | Publishable and secret keys. Supabase removes the legacy JWT API keys at the end of 2026 |
| Zod | 4 | Astro re-exports it as `astro/zod` |

## Rules for Every Web Task

**CSS layer order.** Declare it once at the top of the root stylesheet. A later layer beats an earlier one regardless of specificity:

```css
@layer reset, base, tokens, components, utilities, overrides;
```

**Tokens live in one `:root` block.** Color, spacing, type, radius, shadow and motion all reference custom properties named after the design file's token paths (`--color-semantic-text-primary`). No raw values in component rules. Colors are `oklch()`.

**Animate `transform` and `opacity`.** They composite. `width`, `height`, `top`, `left`, `margin` and `padding` run layout every frame. Motion values come from the design or `motion-design`. Don't invent them. Write motion inside `prefers-reduced-motion: no-preference`.

**Server Components are the Next.js default.** `"use client"` only for state, effects, event handlers or browser APIs. Keep it at the leaves.

**Request APIs are async.** Await `cookies()`, `headers()`, `draftMode()`, `params` and `searchParams`. Request interception lives in `proxy.ts`.

**Caching is explicit.** With Cache Components on, nothing is cached unless it's marked `"use cache"`. Anything that reads request data or uncached data sits inside `<Suspense>`.

**Every input has a `<label>`.** Validate on the server, always. Client-side validation is UX, not security.

**Lane rules.** Vercel is frontend only. Publishable key, RLS enforced, the secret key never touches it. The publishable key goes through `@supabase/ssr` with the user's cookie session, and RLS via `auth.uid()` is the security boundary. A query that needs the secret key belongs on Railway behind an API endpoint. Every Server Function verifies the user itself, because it's reachable by direct POST.

**Support policy.** Baseline widely available: use it freely. Newly available: use it, with an `@supports` or feature-detected fallback only where a miss would break function, not polish. Limited availability: progressive enhancement only. Check `reference/browser-compatibility.md` before reaching for anything newer than container queries.

## Common Mistakes

| Mistake | Why it's wrong |
| --- | --- |
| JS-computed sizing or scroll listeners where container queries or scroll-driven animations do the job | Layout reads force reflow on the main thread |
| `outline: none` with no replacement | Fails WCAG 2.4.7 |
| `user-scalable=no` or `maximum-scale=1` | Blocks zoom. WCAG 1.4.4 |
| `html { font-size: <16px }` or the `62.5%` rem hack | Overrides the user's font-size preference |
| Placeholder text as a label | Disappears on input and isn't a dependable accessible name |
| Infinite scroll with no alternative | Keyboard and screen-reader users lose the footer and their place |
| `loading="lazy"` on the LCP image, or no `fetchpriority="high"` on it | Directly hurts LCP |
| `revalidateTag("tag")` with one argument | Type error. Pass a profile: `revalidateTag("tag", "max")` |
| `priority` on `next/image` | Not the prop. The LCP image takes `fetchPriority="high"` with `loading="eager"` |
| Plain `@supabase/supabase-js` client in server code on Vercel | No cookie session, no refresh. Use `@supabase/ssr` |
| `getSession()` to authorize on the server | Reads the cookie without verifying it. Use `getClaims()` |
| `proxy.ts` as the only auth check | A matcher change silently removes it. Check in the page and the Server Function too |
| Per-user data inside a shared `"use cache"` | Replayed with no RLS check |
| `z` from `astro:content`, or `entry.render()` | `z` is from `astro/zod`. `render()` is imported from `astro:content` |
