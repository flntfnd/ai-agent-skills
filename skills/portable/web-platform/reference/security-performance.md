## Contents

- [Security Headers](#security-headers)
- [Content Security Policy](#content-security-policy)
- [Input Validation](#input-validation)
- [Core Web Vitals](#core-web-vitals)
- [Bundles](#bundles)

## Security Headers

Send these on every response.

```ts
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: "/(.*)", headers: securityHeaders }];
    },
};

export default nextConfig;
```

For an Astro site on Vercel, the same list goes in the `headers` array of `vercel.json`.

- **HSTS**: `includeSubDomains` and `preload` commit every subdomain and are slow to undo. Add them only when every subdomain serves HTTPS.
- **`X-Frame-Options`** is superseded by CSP `frame-ancestors`. It stays because it still applies while the CSP is in report-only mode.
- **`Permissions-Policy`** is enforced by Chromium only. Allow a feature (`geolocation=(self)`) only when the app uses it.
- **`Cross-Origin-Opener-Policy: same-origin`** breaks OAuth flows where a popup talks back through `window.opener`. Use `same-origin-allow-popups` there.

## Content Security Policy

How CSP is deployed depends on how the page is rendered. Roll out with `Content-Security-Policy-Report-Only`, fix what it reports, then enforce.

The strongest form is a per-request nonce with `'strict-dynamic'`:

```
Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'nonce-{RANDOM}' 'strict-dynamic';
    style-src 'self' 'nonce-{RANDOM}';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' https://<project-ref>.supabase.co wss://<project-ref>.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    report-to csp;
```

In Next.js, generate the nonce in `proxy.ts` and set it on both the request and response `Content-Security-Policy` header. Next.js applies it to its own scripts while rendering. The cost: a nonce needs a fresh render per request, so every nonce-protected page is dynamic. No prerendering, no CDN caching, no static shell from Cache Components.

Choose per project:

| Site | Policy |
| --- | --- |
| Authenticated app that's dynamic anyway, or one handling sensitive data | Nonce-based strict CSP in `proxy.ts`. Nothing is lost |
| Static or mostly cached Next.js site | Header-based CSP from `next.config.ts` without nonces. Avoiding `'unsafe-inline'` for scripts there needs hash-based SRI (`experimental.sri`), which keeps pages static but is experimental |
| Astro site | `security.csp` in `astro.config`. Astro hashes its own scripts and styles and emits the policy |

In every form: `object-src 'none'`, `base-uri 'self'` and `frame-ancestors 'none'` are present. `'unsafe-eval'` never ships to production (development needs it for React's error overlay). Each third-party origin goes in the one directive that needs it. Don't widen `default-src`.

Reporting is a `Reporting-Endpoints: csp="https://<endpoint>"` header plus the `report-to csp` directive, with `report-uri` beside it for browsers a few versions back. Reports contain page URLs. The endpoint is first-party and the reports are user data.

Trusted Types (`require-trusted-types-for 'script'`) makes DOM XSS sinks like `innerHTML` reject plain strings. It works in every engine and React supports it. A worthwhile second layer on an app with strict requirements. Start it in report-only mode.

## Input Validation

Validate everything that crosses the server boundary, on the server: Server Function arguments, `FormData`, route and search params, webhook bodies. TypeScript types are erased at runtime. They prove nothing about what a client sent.

```typescript
import { z } from "zod";

const SignupSchema = z.object({
    email: z.email().max(255),
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    age: z.coerce.number().int().min(13).max(120),
});

export async function signup(_prev: unknown, formData: FormData) {
    const parsed = SignupSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
        return { ok: false as const, errors: z.flattenError(parsed.error).fieldErrors };
    }
    // parsed.data is typed and safe to use
    return { ok: true as const };
}
```

- String formats are top-level (`z.email()`, `z.url()`, `z.uuid()`), and errors are formatted with `z.flattenError()` or `z.treeifyError()`. Don't write the method forms (`z.string().email()`, `error.flatten()`).
- Validation isn't authorization. A well-formed request from the wrong user is still refused, by RLS.
- Never render user-supplied HTML. If rich text is a requirement, sanitize on the server with an allowlist.

## Core Web Vitals

Judged at the 75th percentile of real page loads, mobile and desktop separately.

| Metric | Good | Measures |
| --- | --- | --- |
| LCP, Largest Contentful Paint | 2.5 s or less | When the largest visible element finishes rendering |
| INP, Interaction to Next Paint | 200 ms or less | The slowest interaction's delay to the next frame, across the visit |
| CLS, Cumulative Layout Shift | 0.1 or less | Unexpected movement of visible content |

**LCP**, in order of payoff:

1. The LCP image is an `<img>` in the initial HTML with `fetchpriority="high"` and no `loading="lazy"`.
2. Only if it can't be in the HTML (a CSS background), preload it with `<link rel="preload" as="image" fetchpriority="high">`.
3. Same origin, AVIF, at the size it's displayed.
4. Static or cached shell from the CDN, streaming for the rest.

**INP**:

1. Ship less JavaScript. Hydration and long tasks are what block input.
2. In an event handler, update the UI first, then yield before heavy work (`yieldToMain` in `browser-compatibility.md`).
3. Wrap non-urgent React updates in `startTransition`.
4. Don't read layout (`offsetHeight`, `getBoundingClientRect`) after writing styles in the same frame.
5. Third-party scripts run on the same main thread. Audit them.

**CLS**:

1. `width` and `height` on every image and video, `aspect-ratio` on embeds, skeletons sized to the final content.
2. Never insert content above what the user is reading, except in response to their action.
3. Fonts: self-host, with a metric-adjusted fallback. `next/font` and Astro's `fonts` config generate one. `font-display: swap` shows text sooner but shifts layout if the fallback metrics differ. `optional` never shifts.

Lighthouse and the DevTools Performance panel give lab numbers. Debug there. Only field data gives the 75th percentile. LCP and INP are observable in every engine, CLS in Chromium only. Collecting field data is analytics. It has to be in the spec, and it carries no user identifiers.

Hand-written resource hints are for what the framework can't see. Every preload competes with the LCP resource. A `preconnect` or script tag pointing at a third party is a privacy decision, not a performance tweak.

## Bundles

- Measure first. Next.js: `npx next analyze`, and `npx next analyze --output` writes a snapshot to diff against. Astro: a static page with no islands loads no JavaScript at all, so check the Network panel on `astro build` then `astro preview`.
- Libraries that turn data into markup (syntax highlighting, Markdown, non-interactive charts) run in Server Components or at build time. Never in a Client Component.
- `await import()` for code behind an interaction: editors, maps, heavy dialogs.
- For packages with hundreds of exports in Next.js, `experimental.optimizePackageImports`.
- No third-party tag (analytics, chat, embeds) goes in without being in the spec.
