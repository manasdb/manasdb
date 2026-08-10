use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentKind {
    System,
    User,
    Worker,
    Supervisor,
    Coordinator,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentCapability {
    Planner,
    Researcher,
    Reviewer,
    Coder,
    MemoryReader,
    MemoryWriter,
    KnowledgeReader,
    KnowledgeWriter,
    ToolUser,
    Observer,
    Reflector,
    Learner,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub compatibility: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityProfile {
    pub capability: AgentCapability,
    pub enabled: bool,
    pub version: CapabilityVersion,
    pub metadata: HashMap<String, String>,
}
