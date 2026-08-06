use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq, Clone)]
pub enum StorageError {
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Vector dimension mismatch: expected {expected}, got {actual}")]
    VectorDimensionMismatch { expected: usize, actual: usize },

    #[error("Quota exceeded: {0}")]
    QuotaExceeded(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Duplicate entry: {0}")]
    Duplicate(String),

    #[error("Operation timed out: {0}")]
    Timeout(String),

    #[error("Operation cancelled")]
    Cancelled,

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Unsupported operation: {0}")]
    UnsupportedOperation(String),

    #[error("Not implemented")]
    NotImplemented,

    #[error("Integrity violation: {0}")]
    IntegrityViolation(String),

    #[error("Invalid schema version")]
    InvalidSchemaVersion,

    #[error("Corrupted data: {0}")]
    CorruptedData(String),

    #[error("Checksum mismatch")]
    ChecksumMismatch,

    #[error("Retryable error: {0}")]
    Retryable(String),

    #[error("Already exists: {0}")]
    AlreadyExists(String),
    
    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
    
    #[error("Authorization denied: {0}")]
    AuthorizationDenied(String),
    
    #[error("Rate limited: {0}")]
    RateLimited(String),
}
