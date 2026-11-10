# Web stack: axum, sqlx, tower

## Contents

- [Default dependency block](#default-dependency-block)
- [axum](#axum)
- [Errors as IntoResponse](#errors-as-intoresponse)
- [sqlx](#sqlx)
- [Tower middleware](#tower-middleware)
- [Supabase JWT verification](#supabase-jwt-verification)

Platform behavior that isn't Rust-specific (Railway health checks, drain window, deploy config, the Supabase secret key, connection modes) lives in the `backend-conventions` skill. This file is how to do those things in axum and sqlx.

## Default dependency block

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
tokio-util = { version = "0.7", features = ["rt"] }
axum = { version = "0.8", features = ["macros"] }
tower = "0.5"
tower-http = { version = "0.7", features = ["trace", "timeout", "cors", "compression-gzip"] }
sqlx = { version = "0.9", features = ["runtime-tokio", "tls-rustls", "postgres", "uuid", "macros", "migrate"] }
jiff = { version = "0.2", features = ["serde"] }
jiff-sqlx = { version = "0.2", features = ["postgres"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
thiserror = "2"
anyhow = "1"
uuid = { version = "1", features = ["v4", "serde"] }
```

Majors only. Exact versions are in the snapshot in [crate-selection.md](crate-selection.md). Time types are `jiff` through `jiff-sqlx`, not sqlx's `chrono` feature, for the reasons given there. An existing chrono codebase keeps the `chrono` feature and drops the two jiff lines. Every tower-http middleware is behind its own feature, none on by default.

Write against the released axum major in the snapshot, not APIs from its main branch.

## axum

axum is the web framework: Tokio team, Tower middleware, plain async functions as handlers. Path syntax is `/{id}` and `/{*rest}`. The pre-0.8 `/:id` panics at startup.

```rust
use std::{net::Ipv6Addr, sync::Arc};

use axum::{Json, Router, extract::{Path, State}, routing::get};
use tokio::signal::unix::{SignalKind, signal};

struct AppState {
    db: sqlx::PgPool,
}

async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<uuid::Uuid>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(User, "SELECT id, display_name FROM users WHERE id = $1", id)
        .fetch_one(&state.db)
        .await?;
    Ok(Json(user))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let db = sqlx::PgPool::connect(&std::env::var("DATABASE_URL")?).await?;
    let state = Arc::new(AppState { db: db.clone() });

    let app = Router::new()
        .route("/health", get(health))
        .route("/users/{id}", get(get_user))
        .with_state(state);

    // The platform assigns PORT. `::` accepts IPv6 and, on Linux, IPv4 as well.
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(3000);
    let listener = tokio::net::TcpListener::bind((Ipv6Addr::UNSPECIFIED, port)).await?;

    // Containers are stopped with SIGTERM; Ctrl-C is for local runs.
    let mut sigterm = signal(SignalKind::terminate())?;
    let shutdown = async move {
        tokio::select! {
            _ = sigterm.recv() => {}
            _ = tokio::signal::ctrl_c() => {}
        }
        tracing::info!("shutdown signal received, draining");
    };

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown)
        .await?;

    db.close().await;
    Ok(())
}
```

- **Graceful shutdown isn't optional.** `with_graceful_shutdown` stops accepting connections and lets in-flight requests finish. It has no deadline of its own. The platform's drain window is the deadline, and on Railway that defaults to zero until you configure it (see `backend-conventions`). Put a request timeout in the middleware stack so no single request can outlast it, and stop background tasks in the same path ([async-and-concurrency.md](async-and-concurrency.md)).
- **Bind to `PORT` on `::`.** A hardcoded port never receives traffic on Railway, and an IPv4-only bind is unreachable over private networking in older Railway environments.
- **State goes through `with_state(...)`**, extracted with `State<...>`. `Arc<AppState>` is the standard wrapping. `Extension<...>` is for values middleware inserts per request (the authenticated user), not app state. A missing `Extension` is a runtime 500. A missing `State` is a compile error.
- **`/health` proves readiness.** `sqlx::query_scalar!("SELECT 1").fetch_one(&state.db)` with a short timeout, returning 200 or 503.

## Errors as IntoResponse

```rust
use axum::{Json, http::StatusCode, response::{IntoResponse, Response}};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
enum AppError {
    #[error("not found")]
    NotFound,

    #[error("unauthorized")]
    Unauthorized,

    #[error(transparent)]
    Db(#[from] sqlx::Error),

    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound | AppError::Db(sqlx::Error::RowNotFound) => {
                (StatusCode::NOT_FOUND, "not found")
            }
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            AppError::Db(_) | AppError::Other(_) => {
                tracing::error!(error = ?self, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "internal error")
            }
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}
```

Log errors at the response boundary, not inside business logic. Business logic returns `Result`. The response layer decides what to log and what to surface. Internal error text never reaches the client: database errors quote SQL, constraint names, and sometimes values.

## sqlx

sqlx is compile-time-checked SQL, not an ORM. You write SQL and the macros validate it against the schema at build time.

```rust
let user = sqlx::query_as!(
    User,
    "SELECT id, display_name FROM users WHERE id = $1",
    id
)
.fetch_one(&pool)
.await?;
```

- Compile-time checking (the `macros` feature) needs `DATABASE_URL` at build time, or `cargo sqlx prepare` to generate offline metadata (`.sqlx/`, committed, so CI builds without a database). `cargo sqlx prepare --check` in CI catches stale metadata.
- List columns. Always. `SELECT *` means a migration silently changes what the code reads and what a `query_as!` struct must contain.
- Dynamic SQL (optional filters, variable `IN` lists) goes through `sqlx::QueryBuilder` with `push_bind`. Never `format!` values into a query string.
- Multi-statement work uses `pool.begin().await?` and `tx.commit().await?`. A transaction dropped without commit rolls back, which is the cancellation-safe default.
- Migrations: `sqlx::migrate!()` embeds `migrations/` into the binary. Run them from the deploy's pre-deploy step or via `sqlx-cli`, not from every replica's startup path racing each other. Timestamp prefixes (`20260416120000_create_users.sql`) pin the order.
- jiff columns in macros need the wrapper type spelled out: `SELECT created_at AS "created_at: jiff_sqlx::Timestamp" ...`, then `.to_jiff()`.

**Pool sizing.** `PgPoolOptions::new().max_connections(n).acquire_timeout(Duration::from_secs(5))`. Start around 10 per replica and tune from pool-wait metrics. The hard ceiling is the database's connection limit divided across every replica and every other client. Against Supabase, a long-running service connects through the direct connection or the session-mode pooler. Both support the prepared statements sqlx relies on. The transaction-mode pooler doesn't. Which of the two depends on IPv6 reachability, covered in `backend-conventions`' `reference/supabase-admin-client.md`.

### sqlx 0.9: what changes when bumping from 0.8

- **MSRV jumped.** Bump the toolchain pin first.
- **`SqlSafeStr`.** The `query*()` functions take `impl SqlSafeStr`, implemented for `&'static str` and for `sqlx::AssertSqlSafe<T>` over owned strings. Literals work unchanged. A query built at runtime doesn't compile until it's wrapped in `AssertSqlSafe(sql)`. That's the point: each wrap is a place to prove no user input was interpolated, or to switch to `QueryBuilder`.
- **Combined runtime+TLS features are gone** (`runtime-tokio-rustls` and friends). Use `runtime-tokio` plus `tls-rustls`.
- **`PgConnectOptions::options()` escapes automatically.** Remove manual escaping or it double-escapes.
- **MySQL text columns** infer as `String` instead of `Vec<u8>`.

Read the changelog in full before a production bump. It lists more.

## Tower middleware

```rust
use std::time::Duration;

use axum::http::StatusCode;
use tower::ServiceBuilder;
use tower_http::{compression::CompressionLayer, timeout::TimeoutLayer, trace::TraceLayer};

let app = Router::new()
    .route("/users/{id}", get(get_user))
    .layer(
        ServiceBuilder::new()
            .layer(TraceLayer::new_for_http())
            .layer(TimeoutLayer::with_status_code(
                StatusCode::SERVICE_UNAVAILABLE,
                Duration::from_secs(30),
            ))
            .layer(CompressionLayer::new()),
    )
    .with_state(state);
```

Order is the thing to get right. Inside one `ServiceBuilder`, layers run top to bottom on the request: trace first, so it sees and times everything including timeouts, then timeout, then compression, then the handler. Separate `.layer()` calls on a `Router` do the opposite. Each new call wraps everything before it, so the last one added runs first. Use a single `ServiceBuilder` and read it top-down. For a real service the order is trace, request id, timeout, auth, rate limit, handler.

Use tower-http's `TimeoutLayer`, which returns a response. `tower::timeout::TimeoutLayer` returns an error, and axum won't compile that without a `HandleErrorLayer` in front of it. Keep the timeout shorter than the platform's drain window.

Custom middleware is `axum::middleware::from_fn` (or `from_fn_with_state`), not a hand-written `tower::Service`:

```rust
use axum::{extract::Request, middleware::Next, response::Response};

async fn require_user(mut req: Request, next: Next) -> Result<Response, AppError> {
    let user = authenticate(req.headers()).await?;
    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}
```

Hand-roll a `Service` only when `from_fn` genuinely can't express what's needed.

## Supabase JWT verification

Per the lane rules, a Railway service verifies the user's Supabase access token itself, against the project's public keys. It doesn't call the Auth server per request and it never holds a shared JWT secret.

Supabase publishes the signing keys as a JWKS at `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`. The platform side (key types, rotation, revocation, what to do when the JWKS is empty) is in `backend-conventions`' `reference/supabase-admin-client.md`. This is the Rust code.

```toml
jsonwebtoken = { version = "11", features = ["aws_lc_rs"] }   # a crypto backend feature is required
```

```rust
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header, jwk::JwkSet};

#[derive(Debug, serde::Deserialize)]
struct Claims {
    sub: uuid::Uuid,
    role: String,
    exp: u64,
}

#[derive(Debug, thiserror::Error)]
enum AuthError {
    #[error("token has no key id")]
    MissingKid,
    #[error("token signed by an unknown key")]
    UnknownKey,
    #[error(transparent)]
    Jwt(#[from] jsonwebtoken::errors::Error),
}

fn verify(token: &str, jwks: &JwkSet, issuer: &str) -> Result<Claims, AuthError> {
    let kid = decode_header(token)?.kid.ok_or(AuthError::MissingKid)?;
    let jwk = jwks.find(&kid).ok_or(AuthError::UnknownKey)?;

    // The algorithm is fixed here, never taken from the token's header.
    let mut validation = Validation::new(Algorithm::ES256);
    validation.set_issuer(&[issuer]);              // https://<project-ref>.supabase.co/auth/v1
    validation.set_audience(&["authenticated"]);

    let data = decode::<Claims>(token, &DecodingKey::from_jwk(jwk)?, &validation)?;
    Ok(data.claims)
}
```

- `exp` is validated by default, with 60 seconds of leeway. Issuer and audience are validated because they're set. `aud` is `authenticated` for signed-in users.
- Fetch the JWKS with `reqwest` at startup and hold it in an `ArcSwap<JwkSet>` or a `watch` channel. Refresh on a timer of about ten minutes (Supabase's edge caches the endpoint for that long) and once more, rate-limited, when a token arrives with an unknown `kid`. That's what a key rotation looks like. Don't fetch per request.
- A valid token proves who the caller is. It doesn't authorize anything. The service connects to Postgres with RLS bypassed, so every query filters by `claims.sub` (or checks membership) explicitly.
- This path gets explicit tests: valid, expired, wrong issuer, wrong audience, tampered signature, unknown `kid`.
