---
name: code-audit
description: Report-only audit against the house rules in CLAUDE.md across six categories -- general code quality, UI and design-system coherence, real-time audio thread safety, auth/API/data-layer security (Supabase keys, RLS, JWT verification, input validation, PII in logs, retired config and legacy keys), Figma design file handoff readiness, and the Rust toolchain gates (fmt, clippy, tests, cargo audit, cargo deny). Groups findings by category, rates each one critical, warning, or minor with a location, and changes nothing unless asked. Use when the user asks for an audit, a pre-merge or pre-handoff sweep, a security check of auth, API, or data-layer code, a Figma file handoff check, or wants dead code, leaks, hardcoded design values, token drift, RLS or JWT gaps, or audio-thread allocations found and reported. Rust review depth lives in rust-conventions, the design-file gates and Figma process in figma-design-system; this skill is the checklist and the report format.
---

# Audit

An audit reports. It doesn't fix. Don't edit files, don't run `--fix`, don't install missing tools unless I ask.

## How It Runs

1. **Scope.** Run the categories the work touches. Name the ones you skipped and why.
2. **Inspect.** Read the actual code or file. Every finding has a location: `path:line`, or page and layer name in a design file. If you couldn't confirm it, say so. Don't report a guess as a finding.
3. **Report.** Group by category, most severe first, in the format below.
4. **Stop.** If I ask for fixes, do critical first, then re-run the checks that found them.

| The work touches | Run |
| --- | --- |
| Any code | Code |
| Views, components, styles, tokens | Code, UI |
| DSP or a real-time audio callback | Code, Audio Thread |
| Auth, API routes, database, storage, env or config | Code, Security |
| A Figma file headed for handoff | Design Files |
| Any Rust crate | Code, Rust Toolchain, plus the audit checklist in `rust-conventions` |

## Severity

| Level | Meaning | Examples |
| --- | --- | --- |
| **critical** | Exploitable, loses or corrupts data, breaks a lane rule, breaks real-time safety, or depends on something already switched off. Blocks merge or handoff. | Secret key reachable from the client, table in an exposed schema without RLS, allocation or lock on the audio thread, failing tests, dependency with a known vulnerability |
| **warning** | Works today. Causes a bug, drift, or rework later, or stops working on a known date. Fix before or right after merge. | Hardcoded design value, silent failure, deprecated API, missing state or mode, unindexed RLS policy column |
| **minor** | Cleanup. No behavioural risk. | Dead code, inconsistent naming, unexplained `#[allow]` |

Between two levels, pick the higher one and say why.

## Report Format

```
## <Category>
- [critical] path/to/file.ts:42 -- what is wrong, why it matters. Fix: one line.
- [warning]  ...
- [minor]    ...

## <Category with nothing to report>
No findings.

Skipped: <categories> (<reason>)
Totals: <n> critical, <n> warning, <n> minor
```

## Code

1. **Dead code**: unused vars, imports, functions, unreachable branches
2. **Leaks**: uncleared timers, event listener accumulation, unclosed streams, stale closures, retain cycles
3. **Error handling**: unhandled promise rejections, missing error boundaries, silent failures, errors that fail open
4. **Performance**: unnecessary re-renders, N+1 queries, unbounded queries or lists, blocking work on the main thread
5. **Deprecated APIs**: anything with a current replacement available
6. **Tests**: critical paths and business logic covered. Auth, RLS, and JWT verification paths have explicit tests.

Security findings go under Security, not here.

## UI

Token names come from `figma-design-system`. Motion tokens come from `motion-design`. Platform conventions come from the platform skill for the target: `apple-platform`, `android-platform`, `web-platform`.

1. **Hardcoded values**: flag every hardcoded color, spacing, type size, radius, shadow, and duration
2. **Design system coherence**: tokens defined, named consistently, actually used? Parallel systems contradicting each other?
3. **Component structure**: styling co-located correctly? Magic overrides masking structural problems?
4. **Responsive logic**: systematic or a pile of exceptions?
5. **Animation**: timing values hardcoded? Motion consistent with defined tokens? Reduced motion handled?
6. **Custom vs. stock**: any stock components standing in where custom was intended?
7. **Accessibility**: contrast, target size, labels, and focus order, per the platform skill's accessibility reference

## Audio Thread

Run this on any DSP or real-time audio code. For Rust, `rust-conventions` has the crate-level detail.

1. **Allocations**: any allocation or deallocation on the audio thread, including the implicit ones. Containers resizing, string formatting, logging, dropping the last owner of a heap object.
2. **Blocking calls**: locks, mutexes, semaphores, file I/O, network calls, anything that can block
3. **Objective-C messaging**: any ObjC dispatch on the audio thread
4. **Cross-thread communication**: anything other than lock-free ring buffers
5. **Buffer assumptions**: undocumented buffer size assumptions
6. **Load testing**: audio paths tested under load, not just in isolation

Items 1 to 4 are critical. Always.

## Security

Run this on any auth, API, or data-layer code. `web-platform` has the publishable-key and SSR side, plus headers and CSP. `backend-conventions` has the secret key, JWT verification on Railway, and the way out of each old setup below.

Two credentials. The publishable key (`sb_publishable_...`) goes in clients. The secret key (`sb_secret_...`) lives on Railway and nowhere else. `anon`, `authenticated`, and `service_role` are Postgres roles. They belong in policies, not in the names of keys or env vars.

1. **Key exposure**: the secret key anywhere outside Railway. Client bundles, `NEXT_PUBLIC_*` or other public env vars, Vercel code, mobile binaries, source control, logs.
2. **RLS coverage**: RLS enabled on every table in an exposed schema. A table with RLS off is open through the Data API to every role granted access to it, `anon` included.
3. **RLS policies**: scoped to a role with `TO`. Keyed on `auth.uid()`, written `(select auth.uid())` so it's evaluated once per statement. `WITH CHECK` on inserts and updates so a row can't be reassigned. No authorization decision based on `user_metadata`. It's user-editable. Use `app_metadata`. Policy filter columns indexed. Run `EXPLAIN ANALYZE` on complex policies.
4. **RLS bypass paths**: views without `security_invoker = true`, `SECURITY DEFINER` functions in an exposed schema or without a pinned `search_path`, a secret-key client reachable from a request path that should be user-scoped
5. **JWT verification**: Railway verifies Supabase access tokens against the project's public keys at the JWKS endpoint. Algorithm pinned, `exp`, `iss`, and `aud` checked, user ID taken from the verified `sub` and never from the request body. Flag tokens decoded without verification and JWKS cached with no way to refresh on rotation.
6. **Authorization**: every endpoint and Server Function checks who is calling and whether they may touch that specific resource, on the server. Client-side checks don't count.
7. **Input validation**: all external input validated at the boundary, before it reaches the database, the filesystem, a shell, or an outbound request URL. No string-built SQL.
8. **PII and secrets in logs**: any personally identifiable data, token, or key in log output, including dev and debug paths and error messages returned to the client
9. **Third-party SDKs and dependencies**: outbound network calls or telemetry not documented in the codebase. Lockfile committed. Dependency audit clean.
10. **Entitlements**: Apple platform entitlements and privacy declarations scoped to the minimum required

Items 1, 2, and 4 are critical. Always.

### Old setups

Each of these is a finding. It's a warning while it still works and critical once its date has passed. Anything that exposes a secret is critical either way.

| Found | Why |
| --- | --- |
| A JWT-style API key (starts with `eyJ`), or env vars named `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase removes the legacy `anon` and `service_role` API keys at the end of 2026 |
| `SUPABASE_JWT_SECRET`, or any HS256 shared-secret JWT verification | The lane rule is public-key verification against the JWKS. Critical now: whoever holds the secret can mint tokens. |
| `railway.json` or `railway.toml` in the repo | Railway stops reading them on 2026-12-01. Config is `.railway/railway.ts`. |
| `middleware.ts` in a Next.js 16 project | It's `proxy.ts` now |

## Design Files (Figma)

Run this on a Figma file before handoff. `figma-design-system` owns the four gates (`reference/gates.md` has the criteria and how they scale with the task), token naming, the component and state lists, and handoff. Check against it. Don't re-derive them here.

1. **Gate: dark canvas** on every page
2. **Gate: no empty pages or frames**, and the minimum screen set present for every platform the project targets
3. **Gate: token names match the codebase** exactly. Compare variable names against the actual Swift, Kotlin, or CSS token names.
4. **Gate: light and dark mode** on every semantic token and every screen. Switch the variable mode on each screen frame. Nothing should break.
5. **Token population**: variable collections complete, primitives and semantic aliases both present
6. **Component completeness**: every required component present, each with the full state set its type requires
7. **Interactive components**: stateful components have their prototype interactions wired. Variants sitting side by side aren't wired.
8. **Hardcoded values**: any layer with a raw hex fill, raw opacity, or raw font size instead of a variable binding
9. **Detached instances**: an instance detached from its main component stops updating with it. Flag every one.
10. **Accessibility annotations**: icon-only controls without labels, unlabeled form fields, missing contrast notes

A failed gate is critical. It blocks handoff.

## Rust Toolchain

Run the tools. Reading the code isn't enough. `rust-conventions` owns these commands and the manual review checklist that goes with them. If a tool isn't installed, report that. Don't skip the check.

```bash
cargo fmt --all -- --check
CARGO_BUILD_WARNINGS=deny cargo clippy --locked --all-targets --all-features
cargo nextest run --locked --all-features
cargo test --locked --doc --all-features     # nextest does not run doctests
cargo audit
cargo deny check
```

1. **Format**: drift is minor.
2. **Clippy with warnings denied**: `CARGO_BUILD_WARNINGS=deny` needs Cargo 1.97 or later. On older toolchains it's `cargo clippy --all-targets --all-features -- -D warnings`. Report each lint.
3. **Tests**: `cargo test --all-features` where the project doesn't use nextest. A failing test is critical. `#[ignore]` without a documented reason is a warning.
4. **`cargo audit`**: a vulnerability advisory is critical. Unmaintained and yanked notices are warnings. It reads the lockfile, not the build. If `cargo tree -i <crate>` shows the flagged crate is never compiled, it's a minor, and the fix is an `ignore` entry with the reason.
5. **`cargo deny check`**: advisories, bans, licenses, and sources. No `deny.toml` on anything past a prototype is a warning.
6. **`--locked`**: `Cargo.lock` not committed is a warning.
7. **Suppressed lints**: `#[allow(...)]` without an explanation, `dead_code` in particular
