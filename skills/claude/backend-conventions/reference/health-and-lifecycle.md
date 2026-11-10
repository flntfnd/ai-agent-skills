## Contents

- [PORT and interface binding](#port-and-interface-binding)
- [Health checks](#health-checks)
- [Restart policy](#restart-policy)
- [Deploy sequence and graceful shutdown](#deploy-sequence-and-graceful-shutdown)
- [Worker/cron services with no HTTP surface](#workercron-services-with-no-http-surface)

Railway behavior as of 2026-11-10.

## PORT and interface binding

Railway injects `PORT` at runtime and routes public traffic and the deploy health check to it. Read it. A service that hardcodes `3000` starts fine and never receives traffic.

Bind all interfaces on `::`, not `localhost`. `::` accepts IPv6 and IPv4 on Linux, which covers public traffic and private networking in every environment. Environments created after 2025-10-16 resolve `*.railway.internal` to both IPv4 and IPv6. Older ones resolve to IPv6 only, where a `0.0.0.0` bind is unreachable from other services.

```typescript
const port = Number(process.env.PORT) || 3000; // fallback only for local dev
const server = app.listen(port, "::");
```

Railway's edge closes an HTTP request after 5 minutes without data and after 15 minutes regardless. WebSockets are exempt. Anything longer belongs in a job.

## Health checks

Set a health check path on the service (`healthcheck: "/health"` in Infrastructure as Code, see [deployment-config.md](deployment-config.md)).

- Railway polls the path on `PORT` while a deployment is starting and waits for a **2xx**. Any other status, or no answer, counts as not ready.
- It waits up to the health check timeout, **300 seconds** by default (`healthcheckTimeout`, or the `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` service variable). If the check never passes, the deploy fails and the previous deployment keeps serving.
- **It runs at deploy time only.** Once the deployment is live Railway doesn't call the endpoint again. It's a deploy gate, not uptime monitoring. Continuous monitoring is an external checker or alerting on logs and metrics.
- Requests come from the hostname `healthcheck.railway.app`. A framework with a host allowlist has to include it or the check fails with a 400.
- A service with an attached volume can't run two deployments at once, so it has a short downtime on every deploy regardless of the health check.
- With no health check configured, all Railway has to go on is the container starting. Railway doesn't document the exact cutover, so assume traffic can reach a process that isn't ready yet.

**Write the check to prove real readiness, not just that the HTTP server is up.**

```typescript
app.get("/health", async (_req, res) => {
    // Touch the dependency the service can't function without.
    // supabase-js returns failures in `error`; it does not throw.
    const { error } = await supabaseAdmin.from("_healthcheck").select("id").limit(1);
    if (error) {
        res.status(503).json({ status: "not ready" });
        return;
    }
    res.status(200).json({ status: "ok" });
});
```

`_healthcheck` is a one-row table that exists for this. Any cheap query against a table the service owns does the same job. Keep error detail out of the response body: the endpoint is public, and database errors quote hostnames and SQL. Log it instead. A check that depends on the database fails a deploy made while the database is down. That's what you want for a service that can't work without it.

## Restart policy

What Railway does when the process exits:

| Value | Behavior |
| --- | --- |
| `ON_FAILURE` | Restart only on a non-zero exit. **The default, with a maximum of 10 restarts.** |
| `ALWAYS` | Restart whenever the process stops, including clean exits. Paid plans only. |
| `NEVER` | Never restart. |

`restartPolicyMaxRetries` caps attempts before Railway leaves the deployment crashed. Free and trial plans are fixed at `ON_FAILURE` with at most 10 restarts. Paid plans can use any policy and any limit. With multiple replicas, a restart affects only the replica that crashed.

Set the policy explicitly in config so the behavior is in source control. A worker that must stay up uses `ALWAYS`, or `ON_FAILURE` with a generous limit.

Exit non-zero when the process is broken beyond recovery. Don't limp. A crashed service is restarted. A zombie isn't, because nothing probes it after deploy.

## Deploy sequence and graceful shutdown

1. The new deployment builds and starts. Railway waits for its health check.
2. Traffic switches to the new deployment.
3. The old deployment keeps running for the **overlap** period (`overlapSeconds` / `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS`, default 0).
4. Railway sends the old deployment `SIGTERM`, waits the **draining** period (`drainingSeconds` / `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`, **default 0**), then sends `SIGKILL`.

With both at their defaults, `SIGTERM` is followed immediately by `SIGKILL` and in-flight requests are cut. Configure a draining window and use it in code.

```typescript
let shuttingDown = false;

process.on("SIGTERM", () => {
    if (shuttingDown) return;
    shuttingDown = true;

    // Stop accepting connections; in-flight requests finish, idle keep-alives close.
    server.close(async () => {
        await Promise.allSettled([pgPool.end(), redis.quit(), flushTelemetry()]);
        process.exit(0);
    });

    // Hard stop if draining hangs. Comfortably inside the configured window.
    setTimeout(() => process.exit(1), 25_000).unref();
});
```

- Set the force-exit timer under `drainingSeconds` (25s against a 30s window) so the process exits on its own terms before `SIGKILL` arrives.
- Await the cleanup before `process.exit`. Firing `pool.end()` without awaiting and exiting on the next line closes nothing.
- The longest request the service allows has to fit inside the window. Enforce a handler timeout (middleware that responds 503 and aborts the work) shorter than `drainingSeconds`.
- Start the process directly (`node dist/server.js`), not through `npm start` or a shell wrapper. An intermediate process may not forward `SIGTERM` to Node. Railway's docs don't say either way, so don't rely on it.
- Workers drain differently: stop taking new jobs, finish or release the current one. See [background-jobs.md](background-jobs.md).
- Flush the telemetry SDK here too. OpenTelemetry doesn't flush on exit by itself.

## Worker/cron services with no HTTP surface

Railway's health check is HTTP only. Its docs don't cover services without an HTTP server, so this is how to handle a background worker or cron job:

- Don't set a health check path. There's nothing to answer it, the check never passes, and the deploy fails after the timeout.
- Railway's signal for such a service is the process itself: did it start and stay running (worker), or exit 0 (cron). Restart policy is the safety net.
- Fail fast at startup. Validate config and connect to the queue and database before entering the work loop, and exit non-zero if any of that fails. A bad deploy should crash visibly, not idle.
- If the worker should gate its deploys the way a web service does, give it a minimal HTTP listener on `PORT` that reports whether its connections are up, and set the health check path.
- Liveness after deploy is heartbeat logs or a metric, with an alert on absence.
