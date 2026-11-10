//! Database layer.
use sqlx::PgPool;
use uuid::Uuid;

/// A user row.
pub struct User {
    /// Primary key.
    pub id: Uuid,
    /// Normalized display name.
    pub display_name: String,
}

/// Inserts a user and returns its id.
pub async fn create_user(pool: &PgPool, name: &str) -> Result<Uuid, sqlx::Error> {
    let name = my_core::normalize_name(name);
    sqlx::query_scalar!(
        "INSERT INTO users (display_name) VALUES ($1) RETURNING id",
        name
    )
    .fetch_one(pool)
    .await
}

/// Fetches one user by id.
pub async fn fetch_user(pool: &PgPool, id: Uuid) -> Result<User, sqlx::Error> {
    sqlx::query_as!(User, "SELECT id, display_name FROM users WHERE id = $1", id)
        .fetch_one(pool)
        .await
}
