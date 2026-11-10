## Contents

- [Infrastructure as Code](#infrastructure-as-code)
- [Builder choice: Railpack vs Dockerfile](#builder-choice-railpack-vs-dockerfile)
- [Node version](#node-version)
- [Environment variables and secrets](#environment-variables-and-secrets)
- [Railway-provided variables](#railway-provided-variables)
- [Private networking](#private-networking)
- [Monorepo / multiple services in one repo](#monorepo--multiple-services-in-one-repo)
- [If you find the old setup](#if-you-find-the-old-setup)

As of 2026-11-10: the `railway` npm package is at 3.16.0. Supported Node LTS lines are 26, 24, and 22, with 22 the next to go.

## Infrastructure as Code

Railway's deploy configuration is **Infrastructure as Code**: one file, `.railway/railway.ts`, that declares the whole project (services, databases, volumes, domains, variables, replicas) and is applied with the CLI.

```typescript
// .railway/railway.ts
import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway((ctx) => {
    const prod = ctx.isEnvironment("production");
    const repo = github("owner/repo", { branch: "main" });

    // npm workspaces with shared packages: build from the repo root, filter per service.
    const api = service("api", {
        source: repo,
        build: {
            builder: "RAILPACK",
            buildCommand: "npm run build --workspace=apps/api",
            watchPatterns: ["apps/api/**", "packages/shared/**"],
        },
        start: "node apps/api/dist/server.js",
        preDeploy: "npm run db:migrate",
        healthcheck: "/health",
        healthcheckTimeout: 120,
        replicas: prod ? 2 : 1,
        deploy: {
            restartPolicyType: "ON_FAILURE",
            restartPolicyMaxRetries: 5,
            drainingSeconds: 30,
            overlapSeconds: 10,
        },
        env: {
            NODE_ENV: "production",
            SUPABASE_URL: ctx.shared.SUPABASE_URL,
            SUPABASE_SECRET_KEY: preserve(),   // value stays in Railway, never in this file
        },
    });

    const worker = service("worker", {
        source: repo,
        build: { buildCommand: "npm run build --workspace=apps/worker", watchPatterns: ["apps/worker/**", "packages/shared/**"] },
        start: "node apps/worker/dist/worker.js",
        deploy: { restartPolicyType: "ALWAYS", drainingSeconds: 60 },
        env: { SUPABASE_URL: ctx.shared.SUPABASE_URL, SUPABASE_SECRET_KEY: preserve() },
    });

    const cleanup = service("nightly-cleanup", {
        source: repo,
        build: { buildCommand: "npm run build --workspace=apps/jobs", watchPatterns: ["apps/jobs/**", "packages/shared/**"] },
        start: "node apps/jobs/dist/cleanup.js",
        deploy: { cronSchedule: "0 3 * * *" },   // UTC
        env: { SUPABASE_URL: ctx.shared.SUPABASE_URL, SUPABASE_SECRET_KEY: preserve() },
    });

    return project("my-app", { resources: [api, worker, cleanup] });
});
```

| Key | Notes |
| --- | --- |
| `source` | `github("owner/repo", { branch, rootDirectory })` or `image("ghcr.io/...")` |
| `build` | A build command string, or an object: `builder` (`"RAILPACK"` or `"DOCKERFILE"`), `buildCommand`, `dockerfilePath`, `watchPatterns` |
| `start` | Start command. Run the process directly so it receives `SIGTERM` |
| `preDeploy` | Runs after the build and before the deployment starts. A failure stops the deploy. Migrations go here |
| `healthcheck` / `healthcheckTimeout` | Path, and timeout in seconds. See [health-and-lifecycle.md](health-and-lifecycle.md) |
| `replicas` | A number, or a per-region map such as `{ "us-west2": 2, "europe-west4": 1 }` |
| `deploy` | The remaining deploy settings: `restartPolicyType`, `restartPolicyMaxRetries`, `cronSchedule`, `drainingSeconds`, `overlapSeconds` |
| `env` | Literals, references (`db.env.DATABASE_URL`, `ctx.shared.NAME`), or `preserve()` to keep the value Railway already holds |
| `volumeMounts`, `domains`, `tracing` | Volume by mount path, custom domains, `{ enabled, autoInstrumentation }` |

Railway's reference page only documents the shorthand keys. The `deploy` block and the object form of `build` are in the SDK's types, which is what the editor and `railway config plan` check against. There's no per-environment override block. Branch on `ctx.isEnvironment(...)`, as with `replicas` above.

```bash
railway config init          # scaffold .railway/railway.ts
railway config pull          # import the linked project's current settings
railway config plan          # read-only diff; values redacted
railway config apply         # re-plans, asks for confirmation, applies
```

- `plan` is the review step. `--detailed-exit-code` returns 2 when changes are pending, which makes drift detectable in CI.
- `apply` re-plans against live state and refuses if the environment changed since (a dashboard edit, for instance). Dashboard edits work, but they're drift. Make the change in the file, or `pull` afterwards.
- The `railwayapp/config` GitHub Action plans on pull requests that touch `.railway/**` and applies on merge.

## Builder choice: Railpack vs Dockerfile

- **Railpack**: the builder. Zero-config for common languages, Node and Rust included. Right for a standard service with no unusual build requirements. Tuned with `RAILPACK_*` service variables.
- **Dockerfile**: used automatically when the service root contains one. Full control, portable, reproducible locally. Reach for it when the build has real requirements (native dependencies, multi-stage builds, a specific base image, a non-trivial monorepo graph). Not preemptively.

## Node version

Pin the Node version in `package.json` `engines.node`. Railpack reads it. Without a pin it uses the latest LTS, which changes under you. Use a current LTS line: the Supabase client and the Postgres queue libraries have dropped everything older than the oldest supported one.

## Environment variables and secrets

| Type | Scope | Use for |
| --- | --- | --- |
| Service variable | One service, one environment | Per-service config |
| Shared variable | Project-wide per environment | Values reused across services |
| Reference variable | `${{ shared.NAME }}`, `${{ Postgres.DATABASE_URL }}` | Avoids duplicating a value Railway already knows |
| Sealed variable | Provided to builds and deployments, never shown in the UI or returned by the API again | Anything sensitive: `SUPABASE_SECRET_KEY`, API secrets, signing keys |

Sealing is one-way. Know what it costs before you seal:

- A sealed variable can't be unsealed, only overwritten.
- Its value isn't provided to `railway run` or `railway variables`. Local development needs its own credential. That's the right arrangement anyway: a laptop shouldn't hold the production secret key.
- It isn't copied to PR environments, duplicated environments, or duplicated services. A PR environment that needs to boot needs its own non-production credential.

In `.railway/railway.ts`, secrets are `preserve()`: the file declares that the variable exists and Railway keeps the value. `railway config pull --include-variables` writes non-sealed values into the file, secrets included. Don't use it in a repo.

**Nothing sensitive goes in a tracked file.** The test: would this value be fine pasted into a public repo? If not, it's a sealed variable.

## Railway-provided variables

| Variable | What it is |
| --- | --- |
| `PORT` | The port to bind |
| `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_REPLICA_ID`, `RAILWAY_REPLICA_REGION` | This deployment and replica. Put them in structured logs |
| `RAILWAY_SERVICE_NAME`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_PROJECT_NAME` (and `_ID` forms) | Where this is running |
| `RAILWAY_GIT_COMMIT_SHA`, `RAILWAY_GIT_BRANCH` | Present when the deploy came from GitHub. The SHA is the release identifier |
| `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_PRIVATE_DOMAIN` | Public domain if exposed, and the internal DNS name |
| `RAILWAY_VOLUME_MOUNT_PATH` | Attached volume, if any |
| `OTEL_EXPORTER_OTLP_*`, `OTEL_SERVICE_NAME` | Injected once tracing is enabled. See [observability.md](observability.md) |

`RAILWAY_DEPLOYMENT_DRAINING_SECONDS`, `RAILWAY_DEPLOYMENT_OVERLAP_SECONDS`, and `RAILWAY_HEALTHCHECK_TIMEOUT_SEC` are variables you set to configure the platform. Use the equivalent config keys instead, so the setting lives in the repo.

## Private networking

Service-to-service calls inside a project go over the private network, not out through the public internet and back.

- Address: `http://<service-name>.railway.internal:<port>`. Plain `http`. The network is encrypted underneath. The port is the one the target process listens on.
- Same project and same environment only.
- Runtime only. It isn't reachable during the build, so anything that needs another service runs in `preDeploy` or at start.
- Environments created after 2025-10-16 resolve internal names to IPv4 and IPv6. Older ones are IPv6 only. Listen on `::` and both work.
- Clients that only look up IPv4 fail in IPv6-only environments. ioredis is the usual one. Set `family: 0`.

Outbound IPv6 to the public internet is off by default and enabled per service (Settings, Networking). It matters for Supabase's direct database host. See [supabase-admin-client.md](supabase-admin-client.md).

## Monorepo / multiple services in one repo

One repo, one Railway project, one `.railway/railway.ts` at the repo root declaring every service.

- **Shared monorepo** (npm/pnpm workspaces, services import `packages/shared`): don't set a root directory. Every service builds from the repo root with a workspace-filtered build command and its own start command, as in the example above.
- **Isolated monorepo** (services share nothing, for instance a Node API and a Rust worker): give each service's `source` its own `rootDirectory`. Railway then pulls only that subtree.
- `build.watchPatterns` per service either way, so a change under `apps/worker` doesn't redeploy `apps/api`. Include the shared packages the service depends on.
- Common values (Supabase URL, queue connection) are shared variables referenced by each service, not copies.

## If you find the old setup

**`railway.json` or `railway.toml`.** A file by either name in the repo, or a config file path set in a service's settings. Railway calls this Config as Code. Railway stops reading these files on 2026-12-01. It hasn't said what a service that depended on one falls back to, so assume the file is ignored and the service has no health check, no draining window, and default restart behavior. Migrate it:

```bash
railway config migrate               # preview
railway config migrate --apply       # write .railway/railway.ts, clear the config-file setting
railway config plan                  # should show no unexpected changes or deletes
railway config apply
```

- `railway config migrate undo` restores the previous config-file paths.
- A service can't be managed by both systems. `railway config plan` is blocked while a service has a config file path set.
- Check what the migration wrote. `deploy.startCommand` becomes `start`, `deploy.preDeployCommand` becomes `preDeploy`, `deploy.healthcheckPath` becomes `healthcheck`, `deploy.multiRegionConfig` becomes `replicas`, and `environments.<name>` overrides become `ctx.isEnvironment("<name>")` branches. Everything else keeps its name inside `build` or `deploy`.
- Delete the old file once `plan` is clean.

**Nixpacks.** A service whose builder is `NIXPACKS`, or a `nixpacks.toml` in the repo. Railway has deprecated it. Switch the service to Railpack, or to a Dockerfile if the build needs one.
