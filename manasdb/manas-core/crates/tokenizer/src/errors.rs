use thiserror::Error;

#[derive(Error, Debug, PartialEq, Eq, Clone)]
pub enum TokenizerError {
    #[error("Resource limit exceeded: {0}")]
    ResourceLimitExceeded(String),

    #[error("Invalid parameters: {0}")]
    InvalidParameters(String),

    #[error("Tokenizer error: {0}")]
    Internal(String),
}
