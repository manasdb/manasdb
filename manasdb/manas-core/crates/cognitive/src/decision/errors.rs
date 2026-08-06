use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum DecisionError {
    #[error("Failed to generate decision: {0}")]
    EvaluationError(String),
}

impl From<DecisionError> for CognitiveError {
    fn from(err: DecisionError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
