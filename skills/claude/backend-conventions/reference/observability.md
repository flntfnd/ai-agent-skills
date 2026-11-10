## Contents

- [Structured logging](#structured-logging)
- [What to log](#what-to-log)
- [Metrics](#metrics)
- [Traces](#traces)
- [Exporting beyond Railway](#exporting-beyond-railway)

The platform side, for any language: how Railway treats logs, metrics, and traces, what a service emits, and under which field names. Node examples live here. The Rust mechanics (the `tracing` crates, subscriber setup, the OpenTelemetry SDK) are in `rust-conventions`' `reference/observability.md`.

As of 2026-11-10: pino 10.4. Railway's built-in tracing is in preview.

No PII in logs, and no telemetry leaves the service unless the spec opts in. Structured logs to Railway's own log store are the baseline. Tracing and third-party export are decisions the spec makes, not defaults.

## Structured logging

Railway parses a log line as structured when the **entire line is one JSON object**.

- `message` is the text. `msg` is accepted and converted.
- `level` is one of `debug`, `info`, `warn`, `error`. `severity` is accepted. Values are lowercased and mapped to the nearest of the four.
- Every other key is a custom attribute, filterable in the log explorer as `@key:value` (`@level:error`, `@jobId:123`, with `AND`/`OR`/`-` and numeric comparisons).
- Anything written to stderr is treated as `error`, stdout as `info`. Write structured logs to stdout and let `level` carry the severity.
- A multi-line or pretty-printed object isn't parsed. One line per event. Stack traces go inside a string field.
- Limit: **500 log lines per second per replica**. Lines beyond that are dropped.
- Retention depends on the plan: 3 days (Free), 7 (Trial, Hobby), 30 (Pro), up to 90 (Enterprise).

Use a logging library. Don't hand-build JSON at each call site. `pino` is the default for Node, with one adjustment: it writes `level` as a number by default, and Railway can't map that.

```typescript
// lib/log.ts
import pino from "pino";

export const log = pino({
    level: process.env.LOG_LEVEL ?? "info",
    formatters: { level: (label) => ({ level: label }) },   // "info", not 30
    base: {
        deployment: process.env.RAILWAY_DEPLOYMENT_ID,
        replica: process.env.RAILWAY_REPLICA_ID,
        commit: process.env.RAILWAY_GIT_COMMIT_SHA,
    },
    redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
});

log.info({ jobId: job.id, durationMs: Date.now() - start }, "job completed");
```

Never ship the pretty-printed or colorized transport (`pino-pretty`) in production. It defeats the parsing. Local only.

## What to log

Tie every log line back to something identifiable:

- Which deployment and replica emitted it (the `base` fields above).
- A request id or job id, generated at the entry point (HTTP request, queue job, cron run) and carried through every log call for that unit of work. A child logger (`log.child({ requestId })`) does this without threading arguments.
- The trace id as `trace_id`, when tracing is on.
- Enough context to debug from logs alone: what operation, which opaque identifiers (user id, tenant id, job id), what outcome, and how long it took.

Never log secrets, API keys, JWTs, connection strings, full request or response bodies, email addresses, names, phone numbers, or any other personal data. Log ids, not the people behind them. Error objects from HTTP clients and database drivers often embed request headers or query parameters. Log `err.message` and a code, not the whole object, unless the redaction list covers it.

Log at service boundaries: request completed (method, route, status, duration), job started and finished or failed, external call made and its outcome. Don't log inside tight loops or per item of a batch. That's noise, and at 500 lines per second it starts displacing the lines that matter.

Levels: `error` for things someone must look at, `warn` for handled problems (a retry, a fallback), `info` for state changes, `debug` off in production.

## Metrics

Railway records CPU, memory, and network usage per service with no instrumentation. Application metrics (latency percentiles, queue depth, error rate, dead-letter count) need instrumenting: derive them from structured logs (a `durationMs` attribute on every request line is queryable), or push to a metrics backend. Railway's built-in OTLP receiver doesn't accept metrics.

## Traces

Request-scoped logs don't show the path a request took across services (API to worker to external API). OpenTelemetry does. Set it up once there's more than one hop to debug together. A single API server gets most of the value from structured logs with a request id.

Railway's built-in tracing:

- Enabled per service and per environment (Traces tab, `railway trace enable`, or `tracing: { enabled: true }` in the deploy config).
- Railway's edge records a span for each request to a public domain. On the next deploy the service receives `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL` (`http/protobuf`), `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_SERVICE_NAME`, and `OTEL_SERVICE_VERSION`, pointing at a receiver on the host. Any OpenTelemetry SDK that reads the standard variables exports to it with no code-level endpoint config.
- The receiver takes **traces only**. Set `OTEL_METRICS_EXPORTER=none` and `OTEL_LOGS_EXPORTER=none`, or the SDK's default exporters fail noisily.
- Limits: 1,000 spans per replica per 10 seconds, 128 attributes per span. Retention matches the plan's log retention.
- Setting your own `OTEL_EXPORTER_OTLP_ENDPOINT` on the service turns the injection off. Spans then go where you pointed them and don't appear in Railway.
- `autoInstrumentation` instruments supported runtimes from outside the process with no code change, on a best-effort basis.

Node, in-process auto-instrumentation:

```bash
npm install @opentelemetry/api @opentelemetry/auto-instrumentations-node
```

```
NODE_OPTIONS=--experimental-loader=@opentelemetry/instrumentation/hook.mjs --import @opentelemetry/auto-instrumentations-node/register
OTEL_METRICS_EXPORTER=none
OTEL_LOGS_EXPORTER=none
```

That's the ESM form. A CommonJS service uses `--require @opentelemetry/auto-instrumentations-node/register` alone.

Whatever the backend:

- **Flush on shutdown.** OpenTelemetry SDKs batch in memory and don't flush on exit. Call the SDK's `shutdown()` in the `SIGTERM` handler or the last spans before every deploy are lost.
- **Correlate logs and traces.** Add the active trace id to log lines as a top-level `trace_id` (lowercase hex), with `span_id` beside it. Those are the names OpenTelemetry specifies for trace context in non-OTLP logs. With pino, a `mixin` that reads `trace.getActiveSpan()?.spanContext()` does it.
- **Use the stable semantic-convention attribute names** on anything set by hand: `http.request.method`, `http.route`, `http.response.status_code`, `url.path`, `server.address`. HTTP server span names are `{method} {route}` (`GET /users/:id`), never the raw path, which explodes cardinality and can carry identifiers.
- **Attributes follow the logging rules.** No tokens, no bodies, no personal data in span attributes. Auto-instrumentation can capture headers and query strings. Check what it records before enabling it.
- **Sample when volume demands it**: `OTEL_TRACES_SAMPLER=traceidratio` with `OTEL_TRACES_SAMPLER_ARG`.

## Exporting beyond Railway

Railway has **no log drain**. It can't forward a service's stdout to an external endpoint. Longer retention or a central view across projects takes one of:

- **A log forwarder as its own Railway service** (Vector or Fluent Bit) shipping to the backend of choice.
- **Sending from the application** through a vendor SDK or OpenTelemetry over OTLP (`http/protobuf` preferred over gRPC), to any OTLP-compatible backend: Grafana Cloud, Honeycomb, Datadog, New Relic, SigNoz, or a self-hosted collector in the project reached over private networking.

Either one sends operational data to a third party. That has to be in the spec, the vendor documented in the codebase, and the payload held to the same no-PII standard as the logs. Vendor credentials are sealed variables.
