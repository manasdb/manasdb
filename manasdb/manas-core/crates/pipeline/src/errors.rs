use thiserror::Error;

#[derive(Error, Debug)]
pub enum PipelineError {
    #[error("Compilation error: {0}")]
    CompilationFailed(String),
    #[error("Execution failed: {0}")]
    ExecutionFailed(String),
    #[error("Stage resolution error: {0}")]
    StageResolutionError(String),
    #[error("Pipeline cancelled")]
    Cancelled,
}
