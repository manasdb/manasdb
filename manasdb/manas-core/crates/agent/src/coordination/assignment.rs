use crate::models::task::Task;
use crate::capabilities::AgentCapability;
use crate::ids::AgentId;
use crate::coordination::policy::DelegationFailurePolicy;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RoutingPolicy {
    AlwaysLocal,
    PreferLocal,
    PreferRemote,
    CapabilityOnly,
    Broadcast,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskAssignment {
    pub task: Task,
    pub routing_policy: RoutingPolicy,
    pub required_capabilities: Vec<AgentCapability>,
    pub preferred_agent: Option<AgentId>,
    pub fallback_policy: DelegationFailurePolicy,
}

impl TaskAssignment {
    pub fn new(task: Task) -> Self {
        Self {
            task,
            routing_policy: RoutingPolicy::PreferLocal,
            required_capabilities: Vec::new(),
            preferred_agent: None,
            fallback_policy: DelegationFailurePolicy::RetryLocal,
        }
    }
}
