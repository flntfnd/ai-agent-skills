---
name: backend-conventions
description: "Railway backend conventions for standalone compute outside the Next.js request cycle -- API servers, background workers, cron jobs, queue consumers. Covers health checks, graceful shutdown (SIGTERM, drain window), restart policy, PORT binding, Railway Infrastructure as Code (.railway/railway.ts) and the retirement of railway.json/railway.toml, Railpack and Dockerfile builds, sealed and shared variables, private networking, the Supabase secret-key admin client (sb_secret, RLS bypass as the service_role role), verifying Supabase JWTs via JWKS, Postgres connection modes (direct, Supavisor), cron vs worker vs queue (BullMQ, pg-boss, pgmq, pg_cron), retries, idempotency, JSON logging, and OpenTelemetry tracing. Use when building or reviewing a Railway API server, worker, cron job, or queue consumer, wiring health checks or shutdown, writing or migrating Railway deploy config, or using Supabase from a backend outside Next.js. Defers to rust-conventions for Rust code and web-platform for Supabase inside Next.js."
---

# Backend conventions (Railway)

Backend compute on Railway that runs on its own, not behind a Next.js route: API servers, always-on workers, cron jobs, queue consumers. Railway is the trusted backend. The Supabase secret key lives here, RLS is intentionally bypassed here and nowhere else, and Railway verifies user JWTs against Supabase's public keys.

Two dead ends: the `railway.json`/`railway.toml` config files (Railway stops reading them on 2026-12-01) and the Supabase `anon` and `service_role` API keys (removed by the end of 2026). If a project has either, go to "If you find the old setup" in [reference/deployment-config.md](reference/deployment-config.md) and [reference/supabase-admin-client.md](reference/supabase-admin-client.md).

Examples are TypeScript on Node. The platform behavior (health checks, drain window, deploy config, variables, connection modes, job patterns) is the same in any language. **For Rust code use `rust-conventions`.** It has the axum, sqlx, tracing, and JWT-verification versions of everything here. Supabase inside Next.js (publishable key, cookie session, RLS enforced) is `web-platform`'s `reference/supabase-integration.md`. This skill is the other side of that lane.

## Quick reference

| Topic | File |
| --- | --- |
| PORT and interface binding, health checks, restart policy, SIGTERM and the drain window, services with no HTTP surface | [reference/health-and-lifecycle.md](reference/health-and-lifecycle.md) |
| Secret-key admin client, API keys, verifying user JWTs via JWKS, Postgres connection modes, the old keys | [reference/supabase-admin-client.md](reference/supabase-admin-client.md) |
| Cron vs worker vs queue, Railway cron, Supabase Cron and Queues, BullMQ, retry/backoff, idempotency | [reference/background-jobs.md](reference/background-jobs.md) |
| Infrastructure as Code, builders, Node version, variables and sealed secrets, private networking, monorepos, the old config files | [reference/deployment-config.md](reference/deployment-config.md) |
| Structured JSON logging, what to log, metrics, tracing, exporting beyond Railway | [reference/observability.md](reference/observability.md) |

## The two essentials

### The secret key is safe here -- but only here

The Supabase secret key authenticates as the `service_role` Postgres role and bypasses RLS entirely. That's the point of running on Railway. What keeps it safe:

- The key never leaves Railway's environment. Not logged, not returned in a response, not in any file that could reach a client bundle.
- It's a **sealed** Railway variable, never a value in a config file.
- Every query issued with this client does the authorization RLS would otherwise do. Filter explicitly by the user id from the caller's JWT, after verifying it. There's no `auth.uid()` doing it for you.

```typescript
// lib/supabase-admin.ts -- Railway only. Never imported into Vercel/Next.js code.
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,   // sb_secret_...
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);
```

The three auth options are `false` because this client authenticates as the project, not as a user.

### Health checks and graceful shutdown

Railway gates every deploy on the health check and tears down every old deployment with `SIGTERM`.

**Health check**: an HTTP endpoint that returns a `2xx` when the service can actually take traffic.

```typescript
app.get("/health", async (_req, res) => {
    // supabase-js reports failures in `error`; it does not throw.
    const { error } = await supabaseAdmin.from("_healthcheck").select("id").limit(1);
    res.status(error ? 503 : 200).send(error ? "not ready" : "ok");
});
```

Railway polls it only while a deployment is starting (up to 300 seconds by default) and switches traffic once it passes. It's a deploy gate, not a liveness probe. After the deploy goes live Railway never calls it again.

**Graceful shutdown**: when a new deployment goes active, Railway sends the old one `SIGTERM`, then `SIGKILL` after a draining period that **defaults to 0 seconds**. Configure a window and handle the signal:

```typescript
const server = app.listen(Number(process.env.PORT) || 3000, "::");

process.on("SIGTERM", () => {
    server.close(() => process.exit(0));                 // stop accepting, let in-flight requests finish
    setTimeout(() => process.exit(1), 25_000).unref();   // safety net, under a 30s draining window
});
```

Set the window with `drainingSeconds` in the deploy config. Detail in [reference/health-and-lifecycle.md](reference/health-and-lifecycle.md).

## Common mistakes

| Mistake | Why it's wrong |
| --- | --- |
| Hardcoding a port, or binding `localhost` | Railway routes to `PORT`. Bind `::`, which also works for private networking in every environment |
| No `SIGTERM` handler, or no draining window | Default drain is 0 seconds. Every deploy hard-kills in-flight requests |
| Secret-key client in a file that could end up in a Vercel bundle | Bypasses RLS from an untrusted environment, the thing the lane rules exist to prevent |
| Health check that always returns `200`, or wraps supabase-js in `try/catch` and never reads `error` | Deploy looks healthy while the database is unreachable |
| Running a queue worker as a Railway cron job | Cron jobs must exit. A worker never does, so every later run is skipped |
| Transaction-mode pooler (port 6543) as a long-running service's pool | Built for serverless: no prepared statements, no session state, no `LISTEN` |
| Verifying JWTs with a shared secret, or calling the Auth server per request | The lane rule is public-key verification against the JWKS |
| Unstructured `console.log`, or pino with its default numeric levels | Railway indexes single-line JSON with `message` and a string `level` |
