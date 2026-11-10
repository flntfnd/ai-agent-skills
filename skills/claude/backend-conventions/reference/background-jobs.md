## Contents

- [Cron vs worker vs queue](#cron-vs-worker-vs-queue)
- [Railway cron jobs](#railway-cron-jobs)
- [Supabase Cron](#supabase-cron)
- [Background workers](#background-workers)
- [Queue consumers](#queue-consumers)
- [Retry and backoff](#retry-and-backoff)
- [Idempotency](#idempotency)

As of 2026-11-10: bullmq 6.7, ioredis 6.0, pg 8.23, pg-boss 12, graphile-worker 0.18.

## Cron vs worker vs queue

| Pattern | Use for | Shape |
| --- | --- | --- |
| Cron job | Scheduled, time-based tasks: report generation, data cleanup, periodic syncs, cache warming | Starts on a schedule, does the work, **exits**. A run that's still going when the next is due causes the next to be skipped. |
| Background worker | Reacting to events as they happen: a Realtime subscription handler, a stream consumer, long-running computation | Always-on service. Uses resources even when idle. |
| Message queue | Work that needs retries, load leveling, fan-out, or decoupling from the producer's request/response cycle | A broker (Postgres or Redis) holds jobs. One or more always-on consumer services pull and process them. |

The dividing question: **does the process exit when it's done, or stay running?** Cron jobs must exit. Workers and queue consumers must not. Conflating the two is the most common mistake here.

Second question: **does the work need application code at all?** A job that's one SQL statement (delete expired rows, refresh a materialized view) doesn't need a Railway service. Use Supabase Cron.

Don't schedule with an in-process timer (`setInterval`, node-cron) inside the API server. Jobs are lost on every deploy and run once per replica.

## Railway cron jobs

A cron job is a regular Railway service with a schedule: same build, same variables, started on the schedule instead of kept running. Set `cronSchedule` in the service's deploy config (see [deployment-config.md](deployment-config.md)) or in the service settings.

- Standard 5-field crontab syntax (minute, hour, day of month, month, day of week), evaluated in **UTC**.
- Runs must be at least **5 minutes** apart.
- Start times are approximate. Railway doesn't guarantee minute-level precision and a run can start a few minutes late. Don't use it for anything that needs exact timing.
- If the previous run is still active when the next is due, the new run is **skipped**.
- Railway doesn't terminate a cron run. If the process doesn't exit, every later run is skipped, silently: no crash, nothing to alert on. The job closes its connections, exits by itself, and enforces its own deadline:

```typescript
import { log } from "./lib/log.js";

const DEADLINE_MS = 4 * 60 * 1000; // schedule is every 5 minutes

async function main() {
    const timer = setTimeout(() => {
        log.error("cron job exceeded its deadline, forcing exit");
        process.exit(1);
    }, DEADLINE_MS);
    timer.unref();

    await runCleanupJob();
    await pgPool.end();   // open handles keep Node alive
    process.exit(0);      // explicit; don't rely on the event loop draining
}

main().catch((err) => {
    log.error({ err: String(err) }, "cron job failed");
    process.exit(1);
});
```

`railway cron run` triggers a run outside the schedule. `railway cron list` shows recent runs.

## Supabase Cron

Supabase Cron is `pg_cron` with a dashboard: SQL or a database function run inside Postgres on a schedule, down to every second, with run history in `cron.job_run_details`.

Use it when the job is pure SQL: pruning expired rows, refreshing materialized views, rolling up counters, enqueueing work. No service to deploy, no network hop. Supabase's guidance is at most 8 jobs running concurrently and none longer than 10 minutes.

It can also invoke an Edge Function over HTTP. That's for light work only, per the lane rules. Anything heavy is a Railway cron job or a queue consumer. A good split: `pg_cron` enqueues on schedule, a Railway worker consumes. Define cron jobs in migrations, not by clicking in the dashboard.

## Background workers

An always-on Railway service with no public HTTP entrypoint. Deploy it as its own service so it scales, restarts, and is resourced independently of the API server. It reaches other services over private networking.

A worker shuts down differently from a web server. On `SIGTERM`: stop taking new work, finish or hand back the unit in progress, close connections, exit. Size `drainingSeconds` to the longest job the worker may run, and make jobs that can't finish in that time resumable.

## Queue consumers

For work that needs retry, fan-out, or decoupling from the producer's request path. A queue consumer is a background worker, never a cron job.

Pick the backend by what the stack already has:

- **Postgres-backed, on the existing Supabase database.** The default here: no extra infrastructure, and enqueueing can happen in the same transaction as the write that caused it, so a job exists if and only if the row does.
  - **Supabase Queues (pgmq)**: a Postgres extension, managed from the Supabase dashboard. A message goes invisible for a visibility timeout when read and reappears if it isn't deleted, which gives at-least-once delivery. Plain SQL API, usable from any language. No built-in scheduling or backoff curve. Retry policy is yours.
  - **pg-boss** or **graphile-worker**: Node libraries that create their own schema. Retries with backoff, scheduling, dead-letter handling, and concurrency control are built in. graphile-worker uses `LISTEN/NOTIFY` for low latency. Both need a direct or session-mode connection, not the transaction pooler.
- **Redis + BullMQ.** When Redis is already in the project or throughput is beyond what a Postgres queue should carry. Mature, with rate limiting, flows, and priorities. It costs a Redis service, and Redis has to be configured for persistence or jobs are lost when it restarts.

**pgmq consumer** (over the `pg` pool from [supabase-admin-client.md](supabase-admin-client.md)):

```typescript
const QUEUE = "emails";
const VISIBILITY_SECONDS = 60;  // must exceed the longest time one message takes to process
const MAX_ATTEMPTS = 5;
// Both queues are created in a migration: select pgmq.create('emails'); select pgmq.create('emails_dead');

let running = true;
process.on("SIGTERM", () => { running = false; });   // finish the current batch, then exit

while (running) {
    const { rows } = await pgPool.query(
        "select msg_id, read_ct, message from pgmq.read($1::text, $2::int, $3::int)",
        [QUEUE, VISIBILITY_SECONDS, 5],
    );
    if (rows.length === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
    }
    for (const row of rows) {
        try {
            await sendEmail(row.message);
            await pgPool.query("select pgmq.archive($1::text, $2::bigint)", [QUEUE, row.msg_id]);
        } catch (err) {
            log.error({ msgId: row.msg_id, attempt: row.read_ct, err: String(err) }, "job failed");
            if (row.read_ct >= MAX_ATTEMPTS) {
                await pgPool.query("select pgmq.send($1::text, $2::jsonb)", [`${QUEUE}_dead`, row.message]);
                await pgPool.query("select pgmq.delete($1::text, $2::bigint)", [QUEUE, row.msg_id]);
            }
            // otherwise leave it: it becomes visible again after the timeout
        }
    }
}
await pgPool.end();
process.exit(0);
```

By default queues are reachable only through a Postgres connection, which is what a Railway consumer wants. Exposing them through the Data API (`pgmq_public`) is for client-side producers and needs RLS on the queue tables.

**BullMQ worker**:

```typescript
// worker.ts -- its own always-on Railway service
import { Worker } from "bullmq";
import { Redis } from "ioredis";

// maxRetriesPerRequest: null is required for workers. family: 0 lets ioredis
// resolve IPv6-only private network addresses.
const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null, family: 0 });

const worker = new Worker("emails", async (job) => {
    await sendEmail(job.data);
}, { connection, concurrency: 5 });

process.on("SIGTERM", async () => {
    await worker.close();      // stops fetching, waits for in-flight jobs
    await connection.quit();
    process.exit(0);
});
```

BullMQ doesn't install `ioredis` for you. Add it as a direct dependency. Read BullMQ's migration guide before bumping an older project across a major.

## Retry and backoff

Push retry policy into the queue library. Don't hand-roll it.

```typescript
await queue.add("send-email", payload, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 24 * 3600 },   // don't let finished jobs accumulate forever
});
```

- Where nothing provides it (a cron job calling a flaky API, a pgmq consumer), use exponential backoff with jitter. A fixed interval synchronizes retries and hammers a struggling service at the worst moment.
- Separate retryable from permanent failures. A validation error fails identically on every attempt. Send it straight to the dead-letter path.
- Jobs that exhaust retries go to a dead-letter queue or a `failed_jobs` table. Never drop them. Someone has to be able to find and replay them. Alert on the count.

## Idempotency

Every queue here delivers at least once, and cron runs can be re-triggered by hand. Any job can run twice, and it has to be safe when it does.

- **Idempotency keys** for external calls with side effects (charges, emails). Derive a stable key from the logical operation, pass it to the provider if it supports one, record it before acting.
- **Upserts instead of inserts** for rows keyed by a natural identifier.
- **Dedupe by job id** against a table with a unique constraint, written in the same transaction as the job's effect.
- **Visibility timeout or lock duration longer than the job.** A job that outlives it is handed to a second consumer while the first is still running.
