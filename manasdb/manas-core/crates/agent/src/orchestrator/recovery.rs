use crate::ids::TaskId;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RecoveryAction {
    Retry,
    Rollback,
    Replan,
    Abort,
    Escalate,
}

pub trait RecoveryStrategy: Send + Sync {
    fn determine_action(&self, task_id: TaskId, error_reason: &str, retry_count: u32) -> RecoveryAction;
}

pub struct RetryStrategy {
    max_retries: u32,
}

impl RetryStrategy {
    pub fn new(max_retries: u32) -> Self {
        Self { max_retries }
    }
}

impl RecoveryStrategy for RetryStrategy {
    fn determine_action(&self, _task_id: TaskId, _error_reason: &str, retry_count: u32) -> RecoveryAction {
        if retry_count < self.max_retries {
            RecoveryAction::Retry
        } else {
            RecoveryAction::Abort
        }
    }
}

pub struct RecoveryManager {
    strategy: Box<dyn RecoveryStrategy>,
}

impl RecoveryManager {
    pub fn new(strategy: Box<dyn RecoveryStrategy>) -> Self {
        Self { strategy }
    }

    pub fn handle_failure(&self, task_id: TaskId, error_reason: &str, retry_count: u32) -> RecoveryAction {
        self.strategy.determine_action(task_id, error_reason, retry_count)
    }
}
