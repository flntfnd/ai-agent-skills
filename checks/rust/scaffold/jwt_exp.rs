#![allow(clippy::unwrap_used)]
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation, decode, encode};

#[derive(serde::Serialize)]
struct Minted {
    sub: uuid::Uuid,
    exp: u64,
    iss: &'static str,
    aud: &'static str,
}

#[derive(Debug, serde::Deserialize)]
struct Claims {
    sub: uuid::Uuid,
}

fn mint(exp: u64, iss: &'static str, aud: &'static str) -> String {
    let claims = Minted {
        sub: uuid::Uuid::nil(),
        exp,
        iss,
        aud,
    };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(b"k"),
    )
    .unwrap()
}

fn check(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&["iss-ok"]);
    validation.set_audience(&["authenticated"]);
    decode::<Claims>(token, &DecodingKey::from_secret(b"k"), &validation).map(|d| d.claims)
}

#[test]
fn exp_iss_aud_checked_without_struct_fields() {
    let now = jsonwebtoken::get_current_timestamp();
    assert_eq!(
        check(&mint(now + 600, "iss-ok", "authenticated"))
            .unwrap()
            .sub,
        uuid::Uuid::nil()
    );
    assert!(check(&mint(now - 600, "iss-ok", "authenticated")).is_err());
    assert!(check(&mint(now + 600, "other", "authenticated")).is_err());
    assert!(check(&mint(now + 600, "iss-ok", "anon")).is_err());
}
