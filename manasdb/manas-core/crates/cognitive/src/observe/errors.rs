use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum ObserveError {
    #[error("Failed to parse observation: {0}")]
    ParseError(String),
}

impl From<ObserveError> for CognitiveError {
    fn from(err: ObserveError) -> Self {
        CognitiveError::ProviderError(err.to_string()) // Or we can use a new variant if we had one.
    }
}
