use crate::ids::AgentId;
use crate::models::agent::AgentInstance;

pub trait RoutingStrategy: Send + Sync {
    fn select_agent(&self, available: &[AgentInstance]) -> Option<AgentId>;
}

pub struct RoundRobinRouter {
    // In a real implementation this would hold state
}

impl RoundRobinRouter {
    pub fn new() -> Self {
        Self {}
    }
}

impl RoutingStrategy for RoundRobinRouter {
    fn select_agent(&self, available: &[AgentInstance]) -> Option<AgentId> {
        available.first().map(|a| a.definition.id)
    }
}

pub struct LeastLoadedRouter {}

impl LeastLoadedRouter {
    pub fn new() -> Self {
        Self {}
    }
}

impl RoutingStrategy for LeastLoadedRouter {
    fn select_agent(&self, available: &[AgentInstance]) -> Option<AgentId> {
        // Mock: just pick the first one
        available.first().map(|a| a.definition.id)
    }
}
