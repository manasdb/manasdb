use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum ReflectionError {
    #[error("Failed to reflect on history: {0}")]
    AnalysisError(String),
}

impl From<ReflectionError> for CognitiveError {
    fn from(err: ReflectionError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
