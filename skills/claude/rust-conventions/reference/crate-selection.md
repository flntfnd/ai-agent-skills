# Crate selection

Don't pull in a crate for what `std` already covers: `HashMap`, `Duration`, `LazyLock`, `std::sync::mpsc` for trivial channels.

For current best-of-class, check `blessed.rs` or `lib.rs`. For advisories, run `cargo audit`. This file doesn't mirror the RustSec database.

## Contents

- [Version snapshot](#version-snapshot)
- [Core stack](#core-stack)
- [Time: jiff over chrono](#time-jiff-over-chrono)
- [Everything else, by category](#everything-else-by-category)
- [Do not use](#do-not-use)

## Version snapshot

As of 2026-11-10. This is the only place in the skill with exact versions. It's dated for a reason: re-check crates.io before a pin goes into a manifest.

| Item | Current | Notes |
| --- | --- | --- |
| Rust stable | 1.99.1 | Don't pin 1.98.0 or 1.99.0. Both had point releases for miscompilations. |
| Not stable | | Return type notation, `async fn` in `dyn Trait`, `gen` blocks, `try` blocks. |
| Edition | 2024 | The latest. Needs 1.85 or later. |
| `tokio` | 1.54.1 | MSRV 1.85. LTS lines: 1.51.x (to March 2027), 1.53.x (to September 2027). Skip 1.54.0. |
| `tokio-util` | 0.7.20 | |
| `axum` | 0.8.9 | 0.9 unreleased. |
| `tower` / `tower-http` | 0.5.3 / 0.7.1 | |
| `sqlx` | 0.9.0 | MSRV 1.94. |
| `reqwest` | 0.13.5 | |
| `rustls` | 0.23.46 | The lockfile has to be at or past this. Several advisories were fixed in autumn 2026. |
| `serde` / `serde_json` | 1.0.229 / 1.0.154 | |
| `thiserror` / `anyhow` | 2.0.21 / 1.0.104 | |
| `tracing` / `tracing-subscriber` | 0.1.44 / 0.3.23 | |
| `opentelemetry`, `opentelemetry_sdk`, `opentelemetry-otlp` | 0.33.1 | Released in lockstep. Keep on one minor. |
| `tracing-opentelemetry` | 0.34.0 | Pairs with opentelemetry 0.33. |
| `jsonwebtoken` | 11.1.0 | MSRV 1.88. |
| `jiff` / `jiff-sqlx` | 0.2.42 / 0.2.2 | jiff-sqlx targets sqlx 0.9. |
| `clap` / `uuid` / `rand` | 4.6.7 / 1.29.2 / 0.10.3 | |
| `parking_lot` | 0.13.0 | MSRV 1.95. |
| `rtrb` / `ringbuf` / `cpal` | 0.4.1 / 0.6.0 / 0.18.2 | |
| `cargo-nextest` / `cargo-audit` / `cargo-deny` | 0.9.151 / 0.23.0 / 0.20.2 | |
| `wasm-bindgen` / `wasm-pack` | 0.2.130 / 0.15.1 | |

## Core stack

| Category | Pick |
| --- | --- |
| Async runtime | `tokio`. `features = ["full"]` for prototypes, narrowed for production. |
| HTTP server | `axum` |
| HTTP client | `reqwest` with `default-features = false, features = ["rustls", "http2", "json"]`. The old `rustls-tls` feature name is gone, and `.query()`/`.form()` now need the `query`/`form` features. |
| SQL | `sqlx` (compile-time checked, async, no ORM). `sea-orm` if you genuinely want an ORM. `diesel` for sync. |
| Migrations | `sqlx::migrate!`, or `sqlx-cli` externally |
| CLI | `clap` with derive |
| Errors | `thiserror` for libraries, `anyhow` for applications |
| Logging/tracing | `tracing` + `tracing-subscriber` (`env-filter`, `json`) |
| Middleware | `tower`, `tower-http` for the standard set |

## Time: jiff over chrono

chrono's maintainer soft-deprecated `chrono` and `chrono-tz` in January 2026 (`chronotope/chrono#1768`) and points users at `jiff`.

- **New projects**: `jiff`. Contextual errors, IANA timezones built in, calendar arithmetic that's correct across DST.
- **sqlx**: there's no `jiff` feature. Use the `jiff-sqlx` wrapper types (Postgres and SQLite only).
- **Existing chrono codebases**: chrono isn't broken and still gets releases. Migrate when a timezone bug or a larger refactor gives a reason.
- `jiff::Zoned` isn't `Copy` (it carries its `TimeZone`). `jiff::Timestamp` is, and it's the right type for stored instants.

## Everything else, by category

- **Serialization**: `serde` plus a format crate. JSON `serde_json`. TOML `toml`. Compact binary `postcard` (stable wire format) or `bitcode` (fastest, format not stable across versions). YAML `serde-saphyr` (pure Rust) or `serde_yaml_ng` (drop-in for the old API).
- **UUIDs**: `uuid` with `["v4", "serde"]`. Add `v7` when the application generates keys that should be time-ordered.
- **Validation**: `validator` or `garde`.
- **Config**: `config` or `figment` for layered files and env. figment has had no release since 2024.
- **Concurrency**: `tokio-util` (`CancellationToken`, `TaskTracker`), `futures` for stream combinators, `trait-variant`, `async-trait` only where `dyn` is required, `dashmap`, `arc-swap`, `crossbeam-channel`, `flume`.
- **Crypto**: TLS through `rustls`, which defaults to the `aws-lc-rs` provider (a C library built from source; choose the `ring` provider if that build is a problem on the target). Password hashing `argon2`. JWT `jsonwebtoken`, which makes you choose a backend feature (`aws_lc_rs` or `rust_crypto`). `secrecy` to keep keys out of `Debug` output.
- **Testing**: `proptest`, `insta`, `wiremock`, `criterion` for benchmarks.
- **Audio realtime**: `rtrb`, `assert_no_alloc`, `basedrop`, `cpal`. Read [audio-thread.md](audio-thread.md) first.
- **Supply chain / CI**: `cargo-audit`, `cargo-deny`, `cargo-nextest`, `cargo-machete` (unused dependencies), `cargo-semver-checks` (before publishing a library). `cargo-vet` for organizations with strict supply-chain requirements.

## Do not use

| Crate | Why | Use instead |
| --- | --- | --- |
| `bincode` | Unmaintained. Development has stopped. | `postcard`, `bitcode` |
| `serde_yaml` | Archived by its author, final version tagged `+deprecated`. | `serde-saphyr`, `serde_yaml_ng` |
| `serde_yml` | Flagged unsound and unmaintained. | `serde-saphyr`, `serde_yaml_ng` |
| `async-std` | Discontinued. | `tokio` |
| `lazy_static`, `once_cell::sync::Lazy` | Superseded by `std::sync::LazyLock`. | std |
| `ringbuf-basedrop` | Dead since 2022. | `rtrb` |
| `chrono` in new projects | Soft-deprecated by its maintainer. | `jiff` |
