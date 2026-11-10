# Project structure and testing

## Contents

- [Manifest, lints, profiles](#manifest-lints-profiles)
- [Toolchain pin](#toolchain-pin)
- [deny.toml and audit.toml](#denytoml-and-audittoml)
- [Layout: single crate](#layout-single-crate)
- [Workspace](#workspace)
- [What to test](#what-to-test)
- [Async and database tests](#async-and-database-tests)

## Manifest, lints, profiles

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2024"
rust-version = "1.xx"     # same minor as rust-toolchain.toml
publish = false           # an application, never a crates.io package

[lints.rust]
unsafe_op_in_unsafe_fn = "deny"

[lints.clippy]
unwrap_used = "deny"                  # the AGENTS.md floor, enforced
undocumented_unsafe_blocks = "deny"   # every unsafe block carries // SAFETY:

[profile.release]
lto = "thin"
codegen-units = 1
strip = "symbols"
panic = "abort"          # only for binaries that don't need unwinding

[profile.dev]
debug = "line-tables-only"

[profile.dev.package."*"]
opt-level = 3             # keeps heavy dev-deps (image, crypto, DB drivers) tolerable
```

- Put a `clippy.toml` beside it with `allow-unwrap-in-tests = true`, so tests keep their `unwrap()`. It covers `#[test]` functions and `#[cfg(test)]` modules. Helper functions in `tests/*.rs` aren't either, so those files start with `#![allow(clippy::unwrap_used)]`.
- `rust-version`: for an application, the pinned toolchain's minor, bumped together with it. For a published library, the oldest compiler CI actually tests. Resolver 3 (the default under edition 2024) prefers dependency versions whose own `rust-version` fits, so the value changes what gets resolved. Current sqlx and parking_lot need a far newer compiler than edition 2024 itself does. MSRVs are in the snapshot.
- Libraries add `missing_docs = "warn"` under `[lints.rust]`.
- Migrating an older crate: `cargo fix --edition`, commit, then `cargo fix --edition-idioms` as a separate commit.

## Toolchain pin

```toml
# rust-toolchain.toml
[toolchain]
channel = "1.xx.y"        # exact current stable, including the patch number
components = ["rustfmt", "clippy", "rust-src"]
```

The current stable is in the snapshot in [crate-selection.md](crate-selection.md). Never pin a bare `x.y.0` that has since had a point release. Recent point releases fixed a vtable miscompilation and wrong `bool` returns over FFI.

## deny.toml and audit.toml

```toml
# deny.toml
[advisories]
ignore = []

[licenses]
allow = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unicode-3.0", "Zlib", "BSD-1-Clause", "CDLA-Permissive-2.0"]

[licenses.private]
ignore = true                # workspace crates with publish = false need no license field

[bans]
multiple-versions = "warn"
wildcards = "deny"
allow-wildcard-paths = true  # path dependencies between private workspace crates

[sources]
unknown-registry = "deny"
unknown-git = "deny"
```

That allow list is what the default stack in this skill pulls in. Add a license when a new dependency needs one and you've read it. Don't allow them all up front.

```toml
# .cargo/audit.toml
[advisories]
# <crate> is in Cargo.lock through an optional dependency and isn't built:
# `cargo tree -i <crate>` prints nothing.
ignore = ["RUSTSEC-0000-0000"]
```

`cargo deny check advisories` works from the resolved dependency graph, so it doesn't flag crates that never compile. `cargo audit` reads the lockfile and does. Every ignore in either file carries its reason.

## Layout: single crate

For services up to roughly 5k LoC:

```
my-service/
  Cargo.toml
  Cargo.lock              # committed
  rust-toolchain.toml
  clippy.toml
  deny.toml
  .cargo/audit.toml       # only if an advisory is ignored
  .sqlx/                  # offline query metadata, committed
  migrations/
    20260416120000_initial.sql
  src/
    main.rs               # init: tracing, db, router, serve
    config.rs             # env parsing
    error.rs              # AppError + IntoResponse
    routes/               # handlers + request/response types
    domain/               # business logic, no HTTP types
  tests/
    integration.rs
```

Handlers extract, call domain functions, and format the response. Domain functions test without an HTTP server.

## Workspace

Split into crates when a piece is independently versioned, when several binaries share a substantial library, or when compile times justify the caching boundary. Not before. A single crate with well-organized modules is easier to refactor.

```
my-project/
  Cargo.toml             # [workspace]
  crates/
    my-core/             # domain types and logic, no I/O
    my-db/               # database layer, depends on my-core
    my-api/              # HTTP binary
    my-cli/              # CLI binary
```

```toml
[workspace]
members = ["crates/*"]
resolver = "3"            # required: a virtual workspace has no root package to infer it from

[workspace.package]
version = "0.1.0"
edition = "2024"
rust-version = "1.xx"
publish = false

[workspace.lints.rust]
unsafe_op_in_unsafe_fn = "deny"

[workspace.lints.clippy]
unwrap_used = "deny"
undocumented_unsafe_blocks = "deny"

[workspace.dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
sqlx = { version = "0.9", features = ["runtime-tokio", "tls-rustls", "postgres"] }
my-core = { path = "crates/my-core" }
```

Member crates inherit:

```toml
[package]
name = "my-db"
version.workspace = true
edition.workspace = true
rust-version.workspace = true
publish.workspace = true

[lints]
workspace = true

[dependencies]
my-core.workspace = true
tokio.workspace = true
```

- `[lints] workspace = true` is per member and easy to forget. A member without it gets no workspace lints at all.
- Features in `[workspace.dependencies]` are a floor every member inherits. A member can add to them (`tokio = { workspace = true, features = ["test-util"] }`).
- `cargo publish --workspace` publishes interdependent members in order. It isn't atomic. A failure halfway leaves some crates published.

## What to test

Per AGENTS.md: critical paths and business logic. Skip trivial getters and pass-throughs.

- **Unit**: pure functions, parsing, validation, error paths. DSP functions get deterministic tests with known input/output pairs.
- **Integration**: HTTP handlers through the real `Router` (`tower::ServiceExt::oneshot`, or `axum::serve` on `127.0.0.1:0` with a real client), queries against a real test database, end-to-end flows.
- **Auth**: a valid token, an expired one, wrong issuer, wrong audience, bad signature, and a missing header. Each asserts the status code.
- **Property tests** (`proptest`) for serialization round-trips and parser invariants. **Snapshot tests** (`insta`) for complex output.

Mock external I/O at the boundary. That's it. `wiremock` runs a real HTTP server to stand in for a third-party API, which beats trait-based mocks. Don't mock your own database or business logic. Mocks of your own code drift from what it does.

`cargo nextest run` is the runner. It doesn't run doctests, so CI also runs `cargo test --doc`.

## Async and database tests

```rust
#[tokio::test]
async fn fetches_user() {
    let pool = test_pool().await;
    let user = create_test_user(&pool).await;
    let result = fetch_user(&pool, user.id).await.unwrap();
    assert_eq!(result.id, user.id);
}

#[tokio::test(start_paused = true)]
async fn retries_with_backoff() {
    // time-dependent code: sleep and timeout advance instantly and deterministically
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn concurrent_writes() {
    // only when real parallelism is what's being tested
}
```

The default test flavor is `current_thread`. `start_paused` needs tokio's `test-util` feature.

```rust
#[sqlx::test]
async fn user_can_be_created(pool: PgPool) -> anyhow::Result<()> {
    let id = create_user(&pool, "Alice").await?;
    let user = fetch_user(&pool, id).await?;
    assert_eq!(user.display_name, "Alice");
    Ok(())
}
```

`#[sqlx::test]` creates a fresh database per test, runs `migrations/`, passes the pool, and cleans up. It needs sqlx's `macros` and `migrate` features. It needs `DATABASE_URL` pointing at a Postgres where the test process can create databases. That means a local or CI container, not a hosted Supabase project.
