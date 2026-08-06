use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum LearningError {
    #[error("Failed to extract learning: {0}")]
    ExtractionError(String),
}

impl From<LearningError> for CognitiveError {
    fn from(err: LearningError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
