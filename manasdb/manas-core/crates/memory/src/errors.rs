use thiserror::Error;

#[derive(Error, Debug)]
pub enum MemoryError {
    #[error("Validation failed: {0}")]
    Validation(String),
    #[error("Constraint violation: {0}")]
    Constraint(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
    #[error("Invalid ID format: {0}")]
    InvalidId(String),
    #[error("Internal error: {0}")]
    Internal(String),
}
