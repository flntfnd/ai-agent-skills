Astro is for content-driven sites: blogs, marketing pages, documentation, portfolios. For applications with heavy interactivity, use Next.js. The version is in the snapshot table in `SKILL.md`.

Copy on these sites doesn't live in code. It lives in content collections and gets edited through Keystatic in local mode, loaded only under `astro dev`. The `site-content-editing` skill has that setup. When adding a page or section, add or extend a collection. Don't hardcode text in a component.

## Contents

- [Compiler and Markdown](#compiler-and-markdown)
- [Islands](#islands)
- [Content Collections](#content-collections)
- [Server Islands](#server-islands)
- [Page Transitions, Fonts, CSP](#page-transitions-fonts-csp)

## Compiler and Markdown

- **Astro 7's compiler doesn't repair HTML.** Unclosed non-void tags and unterminated attributes are build errors. Invalid nesting, like a `<div>` inside a `<p>`, is emitted as written.
- **Whitespace collapses like JSX.** `compressHTML` defaults to `"jsx"`, so two inline elements on separate lines render with no space between them. Add `{" "}` where a space is needed.
- **Markdown renders through Sätteri**, a Rust pipeline, for both `.md` and `.mdx`. remark and rehype plugins only work with `@astrojs/markdown-remark` installed and `markdown.processor: unified()` set.
- **`@astrojs/db` is gone.** Use a database client directly.

## Islands

Astro ships no JavaScript by default. A component hydrates only with a `client:*` directive:

- `client:load`: immediately. Controls the user reaches for first.
- `client:idle`: when the browser is idle.
- `client:visible`: when it enters the viewport. Anything below the fold.
- `client:media="(max-width: 48rem)"`: when a media query matches.
- `client:only="react"`: no server render. Only for components that can't render on the server.

Before adding an island, check whether HTML and CSS already do it. `<details>`, `<dialog>`, `popover`, invoker commands, anchor positioning and scroll-driven animations cover much of what used to need a framework component (`html.md`, `css.md`).

## Content Collections

Collections are defined in `src/content.config.ts`. `glob()` loads a directory of files, `file()` loads many entries from one data file, and Zod comes from `astro/zod`.

```typescript
// src/content.config.ts
import { defineCollection, reference } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
    loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string().max(160),
            pubDate: z.coerce.date(),
            author: reference("authors"),
            cover: image().optional(),
            draft: z.boolean().default(false),
        }),
});

const authors = defineCollection({
    loader: file("src/content/authors.json"),
    schema: z.object({ id: z.string(), name: z.string() }),
});

export const collections = { blog, authors };
```

```astro
---
// src/pages/blog/[id].astro
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
    const posts = await getCollection("blog", ({ data }) => !data.draft);
    return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<article>
    <h1>{post.data.title}</h1>
    <Content />
</article>
```

- Entries are addressed by `id`, not `slug`. `glob()` derives it from the file name. `file()` requires an `id` on each entry.
- `render()` is imported from `astro:content`. It's not a method on the entry.
- Dates use `z.coerce.date()`, because YAML and JSON sources deliver strings.
- For a CMS or API source, write a loader object with a `load()` function. Don't fetch in page frontmatter. For data that has to be fresh on every request, use a live collection (`src/live.config.ts`, `defineLiveCollection()`, `getLiveCollection()`), which needs an adapter.
- A collection edited through Keystatic has two schemas for the same fields, Keystatic's and Zod's. Change them together.

## Server Islands

`server:defer` on a component makes it a per-request hole in a static page. Each one renders in isolation, so a slow island doesn't block a fast one and the shell still serves from the CDN.

```astro
<UserAvatar server:defer>
    <div slot="fallback" class="avatar-skeleton"></div>
</UserAvatar>
```

Server islands need an adapter. Size the fallback to the final content so the swap doesn't shift layout.

## Page Transitions, Fonts, CSP

- **Page transitions.** Default to native cross-document view transitions: `@view-transition { navigation: auto; }` in CSS. Real page loads, no JavaScript, and browsers without support navigate normally. `<ClientRouter />` from `astro:transitions` turns the site into a client-routed app. Use it only when state has to survive navigation, like a playing audio element. Motion values come from `motion-design`.
- **Fonts.** The `fonts` option in `astro.config` with `fontProviders.local()` self-hosts fonts, generates fallbacks, and exposes each through `cssVariable`. Name that variable after the typography token.
- **CSP.** `security.csp` hashes Astro's own scripts and styles and emits the policy, so a static site carries a strict CSP without nonces (`security-performance.md`).
