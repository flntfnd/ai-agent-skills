# Observability with tracing

Rust mechanics only: the `tracing` crates, subscriber setup, OpenTelemetry export. What to log, how Railway parses it, log and trace limits, field naming, and the privacy rules are in the `backend-conventions` skill's `reference/observability.md`. That file is the what. This one is the how in Rust.

No `println!`/`eprintln!` in production code.

## Contents

- [Instrumenting](#instrumenting)
- [Subscriber setup](#subscriber-setup)
- [Spans across task boundaries](#spans-across-task-boundaries)
- [OpenTelemetry export](#opentelemetry-export)

## Instrumenting

```rust
use tracing::{debug, info, instrument};

#[instrument(skip(pool), fields(user_id = %id))]
async fn fetch_user(pool: &PgPool, id: Uuid) -> Result<User, sqlx::Error> {
    debug!("querying users table");
    let user = sqlx::query_as!(User, "SELECT id, display_name FROM users WHERE id = $1", id)
        .fetch_one(pool)
        .await?;
    info!("user fetched");
    Ok(user)
}
```

`#[instrument]` records every argument with `Debug` unless told otherwise. That's how tokens and request bodies end up in logs. `skip` anything large or sensitive. On handlers, `skip_all` plus explicit `fields(...)` is the safe default. `%` formats with `Display`, `?` with `Debug`. An opaque id is a fine field. An email address, a name, or a token isn't.

Log an error once, at the boundary that decides what to do with it (the `IntoResponse` impl, the job runner). Not at every level it passes through.

## Subscriber setup

```rust
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().json().flatten_event(true))
        .init();
}
```

- Level comes from `RUST_LOG` (`info,my_app=debug,sqlx=warn`). The fallback applies when it's unset or unparsable.
- `flatten_event(true)` puts `message` and the event's fields at the top level of the JSON object instead of nesting them under `fields`. Railway indexes top-level keys, like most log platforms.
- Swap `.json()` for the default formatter in local dev, chosen by an env var. Never ship the pretty/ANSI formatter.
- Needs tracing-subscriber's `env-filter` and `json` features. Initialize once, first thing in `main`.

## Spans across task boundaries

A request's top-level span comes from tower-http's `TraceLayer`. Spans opened inside inherit it. Inheritance breaks in two places, and you restore it by hand:

- `tokio::spawn`: the new task starts with no span. Attach one with `.instrument(tracing::Span::current())` or `.in_current_span()`.
- `spawn_blocking` and other threads: capture `Span::current()` before the hop and `enter()` it inside the closure.

Don't hold a guard from `span.enter()` across an `.await`. Use `.instrument(span)` on the future.

## OpenTelemetry export

Off unless the spec opts in. That's the privacy rule in AGENTS.md. When it's wanted, `tracing-opentelemetry` turns `tracing` spans into OpenTelemetry spans and `opentelemetry-otlp` ships them. The three `opentelemetry*` crates release in lockstep and `tracing-opentelemetry` pairs with exactly one minor of them. A mismatch fails with trait-bound errors. The working pairing is in the snapshot in [crate-selection.md](crate-selection.md).

```rust
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_otlp::SpanExporter;
use opentelemetry_sdk::trace::SdkTracerProvider;
use tracing_subscriber::{EnvFilter, layer::SubscriberExt, util::SubscriberInitExt};

fn init_tracing() -> anyhow::Result<SdkTracerProvider> {
    // Endpoint, headers, and service name come from the standard OTEL_* env vars.
    let exporter = SpanExporter::builder().with_http().build()?;
    let provider = SdkTracerProvider::builder()
        .with_batch_exporter(exporter)
        .build();

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().json().flatten_event(true))
        .with(tracing_opentelemetry::layer().with_tracer(provider.tracer("my-app")))
        .init();

    Ok(provider)
}
```

- Keep the returned provider and call `provider.shutdown()` in the graceful-shutdown path. The batch processor holds spans in memory. Without the flush, the last seconds before every deploy are lost.
- Use opentelemetry-otlp's default features (HTTP/protobuf with the blocking reqwest client). The default batch processor exports from its own thread and is built for that client. Don't pair it with the async `reqwest-client` or `hyper-client` features. `grpc-tonic` needs a Tokio runtime.
- Configuration comes from the `OTEL_*` variables, so this works unchanged with Railway's built-in tracing, which injects them.
- `otel.name`, `otel.kind`, and `otel.status_code` are reserved span fields that set the exported span's name, kind, and status.
- Spans are exported. Log events aren't. To correlate the two, record the trace id on the request span so every JSON log line under it carries it:

```rust
use opentelemetry::trace::TraceContextExt;
use tracing_opentelemetry::OpenTelemetrySpanExt;

let span = tracing::Span::current();
let trace_id = span.context().span().span_context().trace_id();
span.record("trace_id", tracing::field::display(trace_id)); // the span must declare a `trace_id` field
```
