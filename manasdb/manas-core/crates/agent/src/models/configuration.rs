use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct AgentConfiguration {
    pub retry_defaults: super::policy::RetryPolicy,
    pub timeouts: super::policy::TimeoutPolicy,
    pub working_memory_limits: u64,
    pub tool_defaults: Vec<String>,
    pub governance_profile: String,
    pub execution_defaults: super::policy::ExecutionPolicy,
    pub scheduler_defaults: String, // Or specific SchedulerPolicy
    pub telemetry_defaults: String,
}
