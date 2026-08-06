use thiserror::Error;
use pipeline::errors::PipelineError;

#[derive(Error, Debug)]
pub enum CognitiveError {
    #[error("State transition error: {0}")]
    StateError(String),
    #[error("Context error: {0}")]
    ContextError(String),
    #[error("Pipeline error: {0}")]
    PipelineError(#[from] PipelineError),
    #[error("Provider error: {0}")]
    ProviderError(String),
    #[error("Reasoning error: {0}")]
    ReasoningError(String),
}
