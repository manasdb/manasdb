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

use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Warning {
    pub code: String,
    pub message: String,
}

impl Warning {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}
