use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum ReasoningError {
    #[error("Failed to reason over facts: {0}")]
    EvaluationError(String),
}

impl From<ReasoningError> for CognitiveError {
    fn from(err: ReasoningError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
