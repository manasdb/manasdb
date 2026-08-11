use crate::ids::{AgentId, MissionId};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentSession {
    pub parent_id: Option<AgentId>,
    pub child_id: AgentId,
    pub mission_id: MissionId,
    pub delegation_id: String,
    pub correlation_id: String,
    pub metadata: HashMap<String, String>,
}

impl AgentSession {
    pub fn new(
        parent_id: Option<AgentId>,
        child_id: AgentId,
        mission_id: MissionId,
        delegation_id: String,
        correlation_id: String,
    ) -> Self {
        Self {
            parent_id,
            child_id,
            mission_id,
            delegation_id,
            correlation_id,
            metadata: HashMap::new(),
        }
    }
}
