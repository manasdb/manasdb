use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum InterpretError {
    #[error("Failed to interpret observation: {0}")]
    ExtractionError(String),
}

impl From<InterpretError> for CognitiveError {
    fn from(err: InterpretError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
