# Rust check

Compiles every Rust sample in `skills/claude/rust-conventions` and holds it to the rules the skill teaches.

## What it checks

`run.sh` builds a Cargo workspace in `.build/` from the skill's markdown. The manifests, lint table, `rust-toolchain.toml`, `deny.toml`, `.cargo/audit.toml` and every Rust sample are read out of the skill at run time. Nothing is copied into this folder. Then it runs the six commands in the skill's "CI gates" block, as written, in order:

1. `cargo fmt --all -- --check`
2. the clippy gate with warnings denied
3. `cargo nextest run`
4. `cargo test --doc`
5. `cargo audit`
6. `cargo deny check`

Before those it checks that the samples are already rustfmt-clean.

It fails loudly when the skill changes shape: a new Rust sample it doesn't compile, a sample it can't find, a gates block that isn't six plain cargo commands.

A failing `cargo audit` isn't always the skill's fault. New advisories land every week. Read the log in `.build/logs/` and decide whether the skill's stack needs a bump or the advisory is for a crate that never builds.

## What it needs

- rustup with the stable toolchain, `clippy` and `rustfmt`. The check finds cargo in `/opt/homebrew/opt/rustup/bin` or `~/.cargo/bin` if it isn't on PATH.
- `cargo-nextest`, `cargo-audit`, `cargo-deny`.
- `python3`.
- Postgres, because sqlx checks queries against a real database at compile time. Set `DATABASE_URL` to one where the user can create databases. Without it, the check starts a throwaway cluster in `.build/` and stops it on exit, which needs `initdb`, `pg_ctl` and `psql` on PATH. The schema is `schema.sql`.

`run.sh` names anything that's missing.

## Run it

```bash
checks/rust/run.sh               # the check
checks/rust/run.sh --self-test   # breaks a sample on purpose and confirms the check fails
```

First run compiles about 300 crates. After that it's incremental.

## What the generator changes

A sample is a fragment. The generator wraps it in the stubs it leaves out, and makes these changes to the skill's text. They live in the `CONCESSIONS` table at the top of `gen.py`.

| Where | Change | Why |
| --- | --- | --- |
| The fragments crate and the server binary | `#![allow(dead_code)]` | Fragments define items nothing calls |
| The `AppError` and `init_tracing` samples | `pub(crate)` added | The server sample uses them from another module |
| The iterator sample's "Wrong" half | `#[allow(clippy::needless_range_loop)]` | It shows the index loop on purpose |
| Manifests and `rust-toolchain.toml` | `1.xx` filled in from the crate snapshot | The skill keeps exact versions in one place |
| `.cargo/audit.toml` | Placeholder advisory id replaced with a real one | `libsqlite3-sys` is in the lockfile through sqlx and never builds |

`scaffold/` holds the code that isn't a sample: two small library crates for the workspace, compile checks for APIs the skill names in prose, and a test that jsonwebtoken rejects expired and misaddressed tokens.

cpal isn't built here. It needs system audio headers on Linux and the skill has no cpal sample.

## Refresh the lockfile

`Cargo.lock` is committed so `--locked` works and versions don't drift. When the skill's dependencies change, or to pick up new releases:

```bash
checks/rust/run.sh --update-lock
checks/rust/run.sh
```

Commit the new `Cargo.lock` if the check passes.
