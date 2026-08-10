use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct RetryPolicy {
    pub max_retries: u32,
    pub backoff_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TimeoutPolicy {
    pub execution_timeout_ms: u64,
    pub planning_timeout_ms: u64,
}

impl Default for TimeoutPolicy {
    fn default() -> Self {
        Self {
            execution_timeout_ms: 300_000, // 5 mins
            planning_timeout_ms: 60_000,   // 1 min
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct PermissionPolicy {
    pub require_approval_for_tools: bool,
    pub allowed_namespaces: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct ResourcePolicy {
    pub max_tokens_per_task: u32,
    pub max_memory_bytes: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct ExecutionPolicy {
    pub max_parallel_tasks: u32,
    pub allow_delegation: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct AgentPolicy {
    pub execution: ExecutionPolicy,
    pub permission: PermissionPolicy,
    pub retry: RetryPolicy,
    pub timeout: TimeoutPolicy,
    pub resource: ResourcePolicy,
}
