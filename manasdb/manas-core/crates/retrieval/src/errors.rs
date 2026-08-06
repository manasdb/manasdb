use thiserror::Error;

#[derive(Error, Debug)]
pub enum RetrievalError {
    #[error("Invalid filter syntax: {0}")]
    InvalidFilterSyntax(String),
    #[error("Missing embeddings for retrieval")]
    MissingEmbeddings,
    #[error("Dimension mismatch: expected {expected}, found {found}")]
    DimensionMismatch { expected: usize, found: usize },
    #[error("Timeout exceeded during retrieval")]
    TimeoutExceeded,
    #[error("Unsupported retrieval mode: {0}")]
    UnsupportedMode(String),
    #[error("Resource limit exceeded: {0}")]
    ResourceLimitExceeded(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_formatting() {
        let err = RetrievalError::InvalidFilterSyntax("expected colon".to_string());
        assert_eq!(err.to_string(), "Invalid filter syntax: expected colon");

        let err2 = RetrievalError::DimensionMismatch { expected: 128, found: 64 };
        assert_eq!(err2.to_string(), "Dimension mismatch: expected 128, found 64");
    }
}
