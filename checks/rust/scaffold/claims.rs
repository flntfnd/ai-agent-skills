//! Harness-only: API claims the skill makes in prose, not in a sample.
use std::time::Duration;

use sqlx::postgres::PgPoolOptions;

pub async fn pool(url: &str) -> Result<sqlx::PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(url)
        .await
}

pub async fn tx(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::query!("UPDATE users SET display_name = display_name WHERE false")
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    pool.close().await;
    Ok(())
}

pub struct Row {
    pub created_at: jiff_sqlx::Timestamp,
}

pub async fn jiff_override(pool: &sqlx::PgPool) -> Result<jiff::Timestamp, sqlx::Error> {
    let row = sqlx::query_as!(
        Row,
        r#"SELECT created_at AS "created_at: jiff_sqlx::Timestamp" FROM users LIMIT 1"#
    )
    .fetch_one(pool)
    .await?;
    Ok(row.created_at.to_jiff())
}

pub async fn dynamic(
    pool: &sqlx::PgPool,
    ids: &[uuid::Uuid],
    raw: String,
) -> Result<(), sqlx::Error> {
    let mut qb = sqlx::QueryBuilder::<sqlx::Postgres>::new("SELECT id FROM users WHERE id IN (");
    let mut sep = qb.separated(", ");
    for id in ids {
        sep.push_bind(*id);
    }
    qb.push(")");
    qb.build().fetch_all(pool).await?;
    sqlx::query(sqlx::AssertSqlSafe(raw)).execute(pool).await?;
    Ok(())
}

pub async fn health(pool: &sqlx::PgPool) -> bool {
    tokio::time::timeout(
        Duration::from_secs(1),
        sqlx::query_scalar!("SELECT 1").fetch_one(pool),
    )
    .await
    .is_ok_and(|r| r.is_ok())
}

pub fn chunks() {
    let (mut tx, mut rx) = rtrb::RingBuffer::<f32>::new(64);
    if let Ok(chunk) = tx.write_chunk_uninit(8) {
        chunk.fill_from_iter(std::iter::repeat_n(0.0, 8));
    }
    if let Ok(chunk) = rx.read_chunk(8) {
        let (a, b) = chunk.as_slices();
        let _total: f32 = a.iter().chain(b).sum();
        chunk.commit_all();
    }
}

pub fn deferred_drop() {
    let collector = basedrop::Collector::new();
    let shared = basedrop::Shared::new(&collector.handle(), vec![0.0_f32; 64]);
    drop(shared);
}

pub async fn jwks_cache(url: &str) -> anyhow::Result<arc_swap::ArcSwap<jsonwebtoken::jwk::JwkSet>> {
    let set: jsonwebtoken::jwk::JwkSet = reqwest::get(url).await?.json().await?;
    Ok(arc_swap::ArcSwap::from_pointee(set))
}

pub async fn spans() {
    use tracing::Instrument;
    let handle = tokio::spawn(async {}.instrument(tracing::Span::current()));
    let _ = handle.await; // harness: join result is irrelevant here
    let _ = tokio::spawn(async {}.in_current_span()).await; // harness: same
}

pub async fn takes_async_fn(f: impl AsyncFn(u32) -> u32) -> u32 {
    f(1).await
}

pub async fn bounded(urls: Vec<String>) {
    use futures::StreamExt;
    futures::stream::iter(urls)
        .map(|u| async move { u.len() })
        .buffer_unordered(8)
        .collect::<Vec<_>>()
        .await;
}
