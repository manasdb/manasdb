use std::collections::HashMap;
use std::time::Duration;
use crate::core::traits::CapabilityId;

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ExecutionOutcomeType {
    Continue,
    Retry,
    Skip,
    Abort,
}

#[derive(Debug, Clone)]
pub struct RetryPolicy {
    pub max_retries: u32,
    pub backoff_ms: u64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            backoff_ms: 1000,
        }
    }
}

#[derive(Debug, Clone)]
pub struct WorkflowNode {
    pub id: String,
    pub capability: CapabilityId,
    pub configuration: HashMap<String, serde_json::Value>,
    pub retry_policy: RetryPolicy,
    pub timeout: Duration,
    pub next: HashMap<ExecutionOutcomeType, String>,
}
