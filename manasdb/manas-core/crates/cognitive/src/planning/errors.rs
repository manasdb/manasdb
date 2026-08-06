use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum PlanningError {
    #[error("Failed to generate plan: {0}")]
    PlanGenerationError(String),
}

impl From<PlanningError> for CognitiveError {
    fn from(err: PlanningError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
