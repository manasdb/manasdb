use thiserror::Error;
use crate::core::errors::CognitiveError;

#[derive(Error, Debug)]
pub enum MemoryEvolutionError {
    #[error("Failed to evolve memory: {0}")]
    MaintenanceError(String),
}

impl From<MemoryEvolutionError> for CognitiveError {
    fn from(err: MemoryEvolutionError) -> Self {
        CognitiveError::ProviderError(err.to_string())
    }
}
