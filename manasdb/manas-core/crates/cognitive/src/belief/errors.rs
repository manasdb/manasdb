use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum BeliefError {
    #[error("Failed to reconcile beliefs: {0}")]
    ReconciliationError(String),
}

impl From<BeliefError> for CognitiveError {
    fn from(err: BeliefError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
