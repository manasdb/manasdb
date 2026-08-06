use thiserror::Error;
use pipeline::errors::PipelineError;

#[derive(Error, Debug)]
pub enum RuntimeError {
    #[error("Lifecycle error: {0}")]
    LifecycleError(String),
    #[error("Execution manager error: {0}")]
    ExecutionManagerError(String),
    #[error("Pipeline error: {0}")]
    PipelineError(#[from] PipelineError),
    #[error("Scheduler error: {0}")]
    SchedulerError(String),
}
