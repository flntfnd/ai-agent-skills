//! Domain types and logic, no I/O.

/// Normalizes a display name: trims it and collapses inner whitespace.
///
/// # Examples
///
/// ```
/// assert_eq!(my_core::normalize_name("  Ada   Lovelace "), "Ada Lovelace");
/// ```
pub fn normalize_name(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collapses_whitespace() {
        let parsed: u32 = "7".parse().unwrap();
        assert_eq!(parsed, 7);
        assert_eq!(normalize_name("a  b"), "a b");
    }
}
