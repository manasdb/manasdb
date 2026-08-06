use crate::query::optimizer::ExecutionGraph;
use crate::types::RetrievalResult;
use crate::errors::RetrievalError;

pub struct Executor;

impl Executor {
    pub fn new() -> Self {
        Self
    }

    pub fn execute(&self, _graph: ExecutionGraph) -> Result<RetrievalResult, RetrievalError> {
        // Stub implementation
        Err(RetrievalError::UnsupportedMode("Stub".to_string()))
    }
}
