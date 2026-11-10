Support status for every built-in named here is in `browser-compatibility.md`. Server-only code (Next.js server, Astro build) runs on Node and can use whatever the project's Node version has. That's ahead of Safari on several of these.

## Contents

- [Built-ins](#built-ins)
- [Temporal](#temporal)
- [TypeScript Configuration](#typescript-configuration)
- [TypeScript Rules](#typescript-rules)
- [Async and Modules](#async-and-modules)

## Built-ins

Each of these replaces a library or a hand-rolled helper, and works in every current browser:

```typescript
type Task = { status: "open" | "done"; active: boolean; rank: number };
declare const tasks: Task[];
declare const previous: Set<string>;
declare const next: Set<string>;

// Iterator helpers: lazy filter/map/take on any iterator
const firstTen = tasks.values().filter((task) => task.active).take(10).toArray();

// Set algebra
const added = next.difference(previous);

// Grouping and non-mutating sort
const byStatus = Object.groupBy(tasks, (task) => task.status);
const sorted = tasks.toSorted((a, b) => a.rank - b.rank);

// Deferred promise
const { promise, resolve } = Promise.withResolvers<void>();

// Deep copy and IDs
const copy = structuredClone(tasks);
const id = crypto.randomUUID();

// Escape user input for a RegExp
const pattern = new RegExp(RegExp.escape("a+b"), "i");

// Timeout and cancellation without bookkeeping
const controller = new AbortController();
const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);
```

Server-only or feature-detected until `browser-compatibility.md` says otherwise: `using` / `await using`, `Error.isError()`, `scheduler.yield()`, and Temporal.

## Temporal

Temporal replaces `Date`. Immutable values, real time zones, no zero-indexed months. It's under the 95% line (`browser-compatibility.md`), so browser code imports the polyfill. It's the one polyfill I carry, and it goes when Temporal is in every browser.

```typescript
import { Temporal } from "temporal-polyfill";

const now = Temporal.Now.zonedDateTimeISO("America/New_York");
const meeting = Temporal.ZonedDateTime.from("2026-12-01T14:00[America/New_York]");
const until = now.until(meeting, { largestUnit: "day" });
const due = Temporal.PlainDate.from("2026-12-01").add({ months: 1 });
```

Pick the type that matches the data. `Instant` for a timestamp, `ZonedDateTime` for a moment in a place, `PlainDate` for a calendar date with no time or zone. Storing a `PlainDate` as a midnight UTC timestamp is the bug Temporal exists to prevent.

For display, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` and `Intl.DurationFormat` need no library. Never add `moment` or another date library.

## TypeScript Configuration

TypeScript 7 is the native compiler. Same language, much faster checks. `strict` is on by default, the default `target` is the current ES edition, and `baseUrl` no longer exists.

Frameworks own most of the config. Next.js writes its `tsconfig.json`, and Astro projects extend `astro/tsconfigs/strict`. Add to those. Don't replace them. The flags I add on top, shown as a standalone config:

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitOverride": true,
        "verbatimModuleSyntax": true,
        "target": "es2025",
        "module": "esnext",
        "moduleResolution": "bundler",
        "lib": ["es2025", "dom", "dom.iterable"],
        "jsx": "react-jsx",
        "noEmit": true,
        "paths": { "@/*": ["./src/*"] }
    }
}
```

- `strict` is written out so the intent survives a tool that changes defaults.
- `paths` entries are relative to the tsconfig file.
- Temporal's types are in the `esnext` lib (`"esnext.temporal"` for just that part).
- If a linter or plugin needs the JS-based compiler API, alias `@typescript/typescript6` for that tool. Don't downgrade the project.

## TypeScript Rules

- `any` is a type-safety hole, and it spreads to everything it touches. Data from outside the program (network, `FormData`, `JSON.parse`, storage) is `unknown` until a schema or type guard has checked it. A type assertion (`as User`) is not a check.
- Discriminated unions, not optional fields and boolean flags: `{ ok: true; data: T } | { ok: false; error: string }`.
- `satisfies` to check a literal against a type while keeping its literal types.
- Close every `switch` over a union with a `never` check. Adding a member becomes a compile error.

```typescript
function assertNever(value: never): never {
    throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
```

## Async and Modules

- Sequential `await` in a loop is a waterfall. If the calls don't depend on each other, start them together and await `Promise.all`, or `Promise.allSettled` when every outcome matters.
- Break up long tasks by yielding between chunks (`yieldToMain` in `browser-compatibility.md`).
- Named exports everywhere, except where the framework requires a default (`page.tsx`, `layout.tsx`, `error.tsx`, Astro and config files).
- `await import()` for code the first paint doesn't need.
- Don't load a library for one function. `debounce` is a few lines, dates are Temporal and `Intl`, deep clone is `structuredClone`. Every dependency is bundle weight the user pays for and supply-chain surface the project carries.
