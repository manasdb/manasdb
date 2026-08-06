#[derive(Debug, Clone)]
pub enum RuntimeEvent {
    EngineStarted,
    ExecutionStarted { id: String, pipeline_id: String },
    ExecutionCompleted { id: String, duration_ms: u64 },
    ExecutionFailed { id: String, error: String },
    SchedulerStarted,
    SchedulerStopped,
}
