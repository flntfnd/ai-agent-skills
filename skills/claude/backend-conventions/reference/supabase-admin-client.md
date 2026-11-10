## Contents

- [Why the RLS bypass is safe here](#why-the-rls-bypass-is-safe-here)
- [Client setup](#client-setup)
- [API keys](#api-keys)
- [User JWT verification](#user-jwt-verification)
- [If you find the old setup](#if-you-find-the-old-setup)
- [Postgres connections](#postgres-connections)
- [supabase-js admin client vs a raw Postgres client](#supabase-js-admin-client-vs-a-raw-postgres-client)

This file owns three topics: the secret key, migrating a project off the old API keys, and verifying Supabase JWTs on a backend. `web-platform` covers the publishable-key and SSR side and points here for these.

As of 2026-11-10: `@supabase/supabase-js` 2.119 (requires Node 22 or later; a v3 is in prerelease, don't build against it), `jose` 6.2, `pg` 8.23.

## Why the RLS bypass is safe here

RLS is the security boundary everywhere except Railway. On Vercel, every query goes through the publishable key and a user session, and `auth.uid()` enforces row-level access. On Railway, the service authenticates as the project using the secret key, which authenticates as the `service_role` Postgres role. That role has `BYPASSRLS` by design. It's what makes Railway the place for admin operations: user management, cross-tenant aggregation, background writes with no request-scoped user, webhook processing.

What keeps it safe is where the key can go and what the code does with the power:

- It's a sealed Railway service variable. Never in a committed `.env` file, never in `.railway/railway.ts`.
- It's imported only in Railway-deployed code paths. If a file that constructs this client could end up in a Vercel bundle, that's a lane violation regardless of intent.
- Every query does its own authorization. If a query should touch one user's rows, it filters on the user id from the caller's JWT, checked as described below. Never on one taken from the request body or a header.

## Client setup

```typescript
// lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js"; // from `supabase gen types typescript`

export const supabaseAdmin = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    }
);
```

- The three auth options are `false` because this client isn't managing a user session. The defaults are browser-oriented.
- **Keep this client stateless.** Never call `auth.signInWithPassword`, `auth.setSession`, or `auth.verifyOtp` on it. Once it holds a user session it sends that user's token instead of the secret key, and every other request served by the process stops being an admin request. To act as a specific user, create a separate client for that request.
- **supabase-js doesn't throw on query failure.** Every call returns `{ data, error }`. Check `error`, or call `.throwOnError()`.
- Admin user management (ban, delete, list, generate links) is `supabaseAdmin.auth.admin.*`. It only works with the secret key.

## API keys

| Key | Where | Postgres role |
| --- | --- | --- |
| Publishable, `sb_publishable_...` | Browser and Vercel | `anon`, or `authenticated` with a user session. RLS enforced |
| Secret, `sb_secret_...` | Railway only | `service_role`. Bypasses RLS |

`service_role` is the name of the Postgres role. The credential is the secret key.

- **The variable is `SUPABASE_SECRET_KEY`.** It's the name Supabase's docs use for server-only code.
- **One secret key per backend component.** Secret keys are created and revoked individually. The API server and the worker each get their own, so a leak means rotating one.
- **The secret key isn't a JWT.** It goes in the `apikey` header, not `Authorization: Bearer`. supabase-js handles it.
- **Browsers are rejected.** A secret key sent with a browser `User-Agent` gets `401`. That's defense in depth, not safety. A leaked key works fine from curl. Rotate on any leak.
- **Edge Functions**: `verify_jwt` doesn't authenticate a caller that presents only an API key. A function called from Railway has to check the key in code.

## User JWT verification

Railway verifies Supabase access tokens against the project's public keys. Not with a shared secret, and not by asking the Auth server on every request.

Supabase publishes the public half of its signing keys as a JWKS:

```
https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

Supabase signs access tokens with asymmetric keys, ES256 or RS256. The signing key never leaves Supabase. A verifier only needs the public half.

```typescript
// lib/auth.ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const issuer = `${process.env.SUPABASE_URL}/auth/v1`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifyAccessToken(token: string) {
    const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: "authenticated",
        algorithms: ["ES256"],
    });
    return { userId: payload.sub!, role: payload.role as string, sessionId: payload.session_id as string };
}
```

```typescript
// Express middleware
app.use(async (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    try {
        if (!token) throw new Error("missing bearer token");
        res.locals.user = await verifyAccessToken(token);
    } catch {
        res.status(401).json({ error: "unauthorized" });
        return;
    }
    next();
});
```

- `jwtVerify` checks the signature, `exp`, issuer, and audience. Pin `algorithms` to what the project uses so a token can't choose its own.
- `createRemoteJWKSet` caches keys in memory and refetches when it sees an unknown `kid`, which is what a key rotation looks like. Don't fetch per request.
- `supabaseAdmin.auth.getClaims(token)` does the same check through supabase-js. Either is fine. `jose` keeps the auth path independent of the admin client.
- **A valid token says who the caller is, not what they may do.** The admin client bypasses RLS, so `userId` goes into every query's filter.
- **A local check can't see revocation.** A signed-out or banned user's token stays valid until `exp` (one hour by default). For the few operations where that matters (deleting an account, moving money), also check with `supabaseAdmin.auth.getUser(token)`.
- Never log the token or the full claims. The claims include the email address.
- Test this path explicitly, per CLAUDE.md: valid, expired, wrong issuer, wrong audience, bad signature, missing header.

The Rust version is in `rust-conventions`' `reference/web-stack.md`.

## If you find the old setup

**JWT-style API keys.** Keys that start with `eyJ` and are named `anon` and `service_role`. Variables called `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY`. Hand-rolled requests that send the key as `Authorization: Bearer`. Supabase's deadline for removing these keys is the end of 2026. Migrate:

1. Create a publishable key and one secret key per backend service in the dashboard (Settings, API Keys).
2. Set each service's `SUPABASE_SECRET_KEY` as a sealed variable and deploy. Move hand-rolled requests to the `apikey` header. The Vercel side switches to the publishable key (`web-platform`).
3. If the dashboard lists the old keys, disable them. It's reversible and covers both at once, so it proves nothing depends on them.
4. Remove the old variables.

**Shared-secret JWT signing (HS256).** A `SUPABASE_JWT_SECRET` used to verify tokens, or a JWKS endpoint that returns an empty key set, so every token fails against it. Don't verify with the shared secret. Migrate the signing keys:

1. In the dashboard's JWT signing keys settings, create an asymmetric standby key.
2. Wait about 20 minutes for verifiers to pick it up, then rotate to it.
3. Revoke the shared secret once tokens issued under it have expired.

While that's in progress, verify with `supabaseAdmin.auth.getClaims(token)`. It asks the Auth server when the project has no asymmetric key.

## Postgres connections

Only relevant when the service opens its own Postgres connection (`pg`, Drizzle, Prisma, sqlx, a queue library). A service that uses supabase-js alone talks to the Data API over HTTPS and holds no database connections.

| Mode | Endpoint | Fit for a Railway backend |
| --- | --- | --- |
| Direct connection | `db.<ref>.supabase.co:5432` | **First choice.** Full Postgres: prepared statements, session state, `LISTEN/NOTIFY`, advisory locks. IPv6 only unless the project has the IPv4 add-on. |
| Shared pooler, session mode | `aws-<n>-<region>.pooler.supabase.com:5432` | Same capabilities over IPv4. Username is `postgres.<ref>`. |
| Shared pooler, transaction mode | `...pooler.supabase.com:6543` | **Wrong tool here.** For serverless functions. No prepared statements, session state, `LISTEN`, or session advisory locks. |
| Dedicated pooler (PgBouncer) | `db.<ref>.supabase.co:6543` | Paid plans, transaction mode only. For very high connection counts. |

IPv6 decides it on Railway. Outbound IPv6 is disabled per service by default, and the direct host has only an IPv6 address. Either enable Outbound IPv6 on the Railway service and use the direct connection, or use the session-mode pooler. Get it wrong and you see `ENETUNREACH` at connect time.

Migrations, `pg_dump`, and queue libraries that use `LISTEN/NOTIFY` need direct or session mode. Copy connection strings from the dashboard's Connect dialog. The pooler host can't be derived from the region. `sslmode=require` at minimum.

```typescript
// lib/db-pool.ts -- for raw SQL alongside supabase-js
import { Pool } from "pg";

export const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL, // direct, or session-mode pooler
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});
```

Pool size: the ceiling is the project's max connections for its compute size, shared by every replica of every service, the dashboard, and migrations. Supabase doesn't publish a recommended number. Start at ten per replica and tune from observed wait time.

A raw connection as the `postgres` role also bypasses RLS. Same rule: the query does the authorization.

## supabase-js admin client vs a raw Postgres client

Use `supabaseAdmin` for:
- Anything modeled as a Supabase table with generated types: CRUD, upserts, RPC calls to Postgres functions.
- Auth admin operations and Storage (signed URLs, admin bucket access). There's no raw-SQL equivalent.

Use a raw Postgres client when:
- The query is awkward in the query builder: deep joins, window functions, recursive CTEs, bulk operations.
- The service needs a transaction spanning several statements. supabase-js doesn't expose one. The alternative is a Postgres function called through `.rpc()`.
- Consuming a queue (pgmq, pg-boss, graphile-worker) or using `LISTEN/NOTIFY`.
- Running migrations.

Both can coexist in the same service.
