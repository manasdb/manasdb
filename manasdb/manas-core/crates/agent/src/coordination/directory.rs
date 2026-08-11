use crate::capabilities::{AgentCapability, CapabilityVersion};
use crate::models::agent::AgentInstance;
use crate::coordination::registry::AgentRegistry;
use std::sync::Arc;

pub struct CapabilityMatcher {}

impl CapabilityMatcher {
    pub fn is_compatible(required: &AgentCapability, _required_version: Option<&CapabilityVersion>, agent: &AgentInstance) -> bool {
        // Find if agent has this capability
        if let Some(profile) = agent.definition.capabilities.iter().find(|p| p.capability == *required) {
            if !profile.enabled {
                return false;
            }
            // For now, version matching logic is stubbed
            // In a real implementation we would match major, minor, and compatibility string
            return true;
        }
        false
    }

    pub fn can_handle(required: &[AgentCapability], agent: &AgentInstance) -> bool {
        required.iter().all(|req| Self::is_compatible(req, None, agent))
    }
}

pub trait AgentDirectory: Send + Sync {
    fn find_capable_agents(&self, capabilities: &[AgentCapability]) -> Vec<AgentInstance>;
}

pub struct DirectoryService {
    registry: Arc<dyn AgentRegistry>,
}

impl DirectoryService {
    pub fn new(registry: Arc<dyn AgentRegistry>) -> Self {
        Self { registry }
    }
}

impl AgentDirectory for DirectoryService {
    fn find_capable_agents(&self, capabilities: &[AgentCapability]) -> Vec<AgentInstance> {
        let all_agents = self.registry.get_all();
        all_agents.into_iter()
            .filter(|agent| CapabilityMatcher::can_handle(capabilities, agent))
            .collect()
    }
}
