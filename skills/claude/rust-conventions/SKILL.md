---
name: rust-conventions
description: Operational Rust conventions for production code, extending the floor rules in CLAUDE.md. Covers edition 2024 idiom, toolchain pinning, Cargo manifest and workspace setup (lints table, MSRV-aware resolver, profiles), CI gates (fmt, clippy, nextest, cargo-audit, cargo-deny), error handling with thiserror and anyhow, async/Tokio discipline (cancellation safety, Send bounds, structured concurrency, graceful shutdown), the axum/sqlx/tower web stack including Supabase JWT verification, tracing and OpenTelemetry, concurrency primitives, realtime audio-thread rules (cpal, lock-free ring buffers, no-alloc checks, deferred drop), testing, unsafe and FFI, WASM, a crate selection guide with a dated version snapshot, and an audit checklist. Use when writing, reviewing, or auditing Rust code, editing Cargo.toml or rust-toolchain.toml, setting up a Rust service or workspace, wiring Rust CI, choosing or upgrading a crate, or debugging async, ownership, lifetime, or audio-thread problems.
---

# Rust conventions

The operational layer on top of the Rust floor in CLAUDE.md. Default stack: Tokio, axum, sqlx, tracing, thiserror + anyhow, edition 2024.

Exact versions live in one place, the dated snapshot in [reference/crate-selection.md](reference/crate-selection.md). Everything else names majors only. Check crates.io or releases.rs before a pin goes into a manifest.

## Quick reference

| Topic | File |
| --- | --- |
| Manifest, toolchain pin, lints, profiles, workspaces, project layout, test strategy | [reference/testing-and-structure.md](reference/testing-and-structure.md) |
| Runtime, cancellation safety, Send bounds, structured concurrency, shutdown, channels, locks | [reference/async-and-concurrency.md](reference/async-and-concurrency.md) |
| axum, sqlx, Tower middleware, Supabase JWT verification | [reference/web-stack.md](reference/web-stack.md) |
| tracing setup, JSON logs, OpenTelemetry export | [reference/observability.md](reference/observability.md) |
| Realtime audio thread: callback rules, ring buffers, no-alloc checks, drop discipline, crate status | [reference/audio-thread.md](reference/audio-thread.md) |
| Iterators, allocation, unsafe and FFI, WASM, doctests | [reference/performance-and-ffi.md](reference/performance-and-ffi.md) |
| Version snapshot, crate picks by category, crates not to use | [reference/crate-selection.md](reference/crate-selection.md) |

## The floor

**No `unwrap()` outside tests and examples.** Propagate with `?`. Where failure is genuinely impossible (a regex literal, a lock nothing panics while holding), use `.expect("...")` with a message that states the invariant. `.expect("should never happen")` is an `unwrap()` with extra typing. The manifest denies `clippy::unwrap_used`, so this is enforced, not remembered.

**`thiserror` for libraries, `anyhow` for applications.** Don't mix them within a boundary.

```rust
// Library: errors are API surface. Stable variants, source chains, matchable.
#[derive(thiserror::Error, Debug)]
pub enum DbError {
    #[error("connection failed")]
    Connection(#[from] sqlx::Error),
    #[error("row not found for id {id}")]
    NotFound { id: uuid::Uuid },
}

// Application: context strings are the value. with_context is lazy, so it costs nothing on success.
let raw = tokio::fs::read_to_string(path)
    .await
    .with_context(|| format!("reading config from {}", path.display()))?;
```

No `Box<dyn Error>` in a library API. No stringly-typed errors. No `let _ = fallible()` without a comment saying why the error is safe to drop.

**No `clone()` to dodge the borrow checker.** Fix the ownership: pass `&T`, return owned values from constructors and references from accessors, take `Cow<'_, T>` when a parameter can be either, share with `Arc<T>` across tasks. `clone()` is right when the type is cheap (`Arc`, ids) or you actually need an independent copy.

**Iterators over index loops.** `zip`, `enumerate`, `windows`, `chunks_exact`. Detail in [reference/performance-and-ffi.md](reference/performance-and-ffi.md).

**Every `unsafe` block has a `// SAFETY:` comment** naming the invariants it relies on. The manifest denies `clippy::undocumented_unsafe_blocks`.

## Edition and toolchain

- Every crate is `edition = "2024"`.
- Use what 2024 and current stable give you: let chains (`if let Some(x) = a && let Ok(y) = b(x)`), `if let` guards on match arms, async closures, `use<..>` to narrow what a returned `impl Trait` captures.
- Stable only. No nightly features. The snapshot lists the ones people reach for that aren't there.
- `rust-toolchain.toml` pins an exact stable release, patch number included. Pin the latest patch of a minor, never an `x.y.0` that has since had a point release. Point releases fix miscompilations. Bump on a schedule.
- `rust-version` matches the pinned minor for an application. It's load-bearing: the resolver prefers dependency versions whose MSRV fits it, so a stale low floor quietly holds dependencies back.

The manifest, lint table, profiles, and workspace layout are in [reference/testing-and-structure.md](reference/testing-and-structure.md).

## CI gates

These are the canonical commands. `code-audit` defers to them.

```bash
cargo fmt --all -- --check
CARGO_BUILD_WARNINGS=deny cargo clippy --locked --all-targets --all-features
cargo nextest run --locked --all-features
cargo test --locked --doc --all-features     # nextest does not run doctests
cargo audit
cargo deny check
```

- **Clippy with warnings denied.** `CARGO_BUILD_WARNINGS=deny` on Cargo 1.97 or later; `cargo clippy --all-targets --all-features -- -D warnings` on older toolchains. Don't set `-D warnings` through `RUSTFLAGS`. It invalidates the build cache.
- **`--locked`**, with `Cargo.lock` committed. Compromised releases of popular crates have sat on crates.io for over an hour before being pulled. The lockfile is what keeps a CI run from picking one up.
- **`cargo audit`** checks `Cargo.lock` against the RustSec advisory database. A vulnerability advisory is critical and blocks merge. Unmaintained and yanked notices are warnings: replace the crate, or record an `ignore` entry with the advisory id and a written reason.
- **`cargo deny check`** runs the advisories, bans, licenses, and sources checks against `deny.toml`. Required on anything past a prototype.
- **Tests**: `cargo nextest run` is the default runner. `cargo test --all-features` is fine where a project doesn't use it.
- rustfmt defaults. Don't customize without a written reason.

## Audit checklist

The manual review that goes with the gates.

1. **Floor rules**: `unwrap()` or reasonless `expect()` outside tests? `clone()` that only exists to satisfy the borrow checker? Index loops an iterator would express? `unsafe` without a `// SAFETY:` comment? `#[allow(...)]` without an explanation?
2. **Error types**: libraries on `thiserror` with real source chains? Applications on `anyhow` with `with_context`? `Box<dyn Error>` in a library API? Errors silently dropped?
3. **Edition, toolchain, lints**: edition 2024 everywhere? Toolchain pinned to a current patch release, `rust-version` consistent? `[lints]` inherited by every workspace member?
4. **CI**: all six gates wired, `--locked`, `Cargo.lock` committed, `deny.toml` present?
5. **Async**: a `std` lock held across `.await`? Unbounded channels? Blocking work on a runtime thread? Untracked `tokio::spawn` from a handler? Non-cancel-safe futures in `select!`? Mixed runtimes?
6. **HTTP**: `SIGTERM` handled and `with_graceful_shutdown` wired? Bound to `PORT`? Request timeout set? Middleware order deliberate? Errors mapped in `IntoResponse` without leaking internals?
7. **Database**: explicit column lists? Compile-time checking on, `.sqlx/` committed? Dynamic SQL through `QueryBuilder`? Pool sized against the provider's limit?
8. **Auth**: JWTs checked against the JWKS with algorithm, issuer, and audience pinned? Every query filtered by the token's user id? Tests for the failure cases?
9. **Tracing**: `tracing`, not `println!`? No secrets, tokens, or PII in fields? Telemetry export only where the spec opts in?
10. **Audio thread**: any allocation, lock, blocking call, logging, or heap drop in the callback? Ring buffer sizes justified in a comment? No-alloc check in debug builds? Tested under load?
11. **Unsafe and FFI**: pointers null-checked, no unwinding across the boundary, ownership of every pointer documented?
12. **Docs and profiles**: public API documented with compiling doctests? Release profile deliberate (`lto`, `codegen-units`, `panic`)? Perf claims measured with `--release`?
