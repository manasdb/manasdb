use crate::ids::TaskId;
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CompletionPolicy {
    FailFast,
    Continue,
    BestEffort,
    Majority,
    Custom,
}

#[derive(Debug, Clone)]
pub struct ExecutionResult {
    pub success: bool,
    pub task_summaries: HashMap<TaskId, String>,
    pub timings_ms: HashMap<TaskId, u64>,
    pub warnings: Vec<String>,
}

impl Default for ExecutionResult {
    fn default() -> Self {
        Self {
            success: true,
            task_summaries: HashMap::new(),
            timings_ms: HashMap::new(),
            warnings: Vec::new(),
        }
    }
}

pub struct MissionManager {
    policy: CompletionPolicy,
}

impl MissionManager {
    pub fn new(policy: CompletionPolicy) -> Self {
        Self { policy }
    }

    pub fn should_continue(&self, failed_tasks: usize, total_tasks: usize) -> bool {
        match self.policy {
            CompletionPolicy::FailFast => failed_tasks == 0,
            CompletionPolicy::Continue => true,
            CompletionPolicy::BestEffort => true,
            CompletionPolicy::Majority => {
                if total_tasks == 0 {
                    true
                } else {
                    failed_tasks <= (total_tasks / 2)
                }
            }
            CompletionPolicy::Custom => true,
        }
    }
}
