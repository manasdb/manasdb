use crate::capabilities::{AgentKind, CapabilityProfile};
use crate::ids::{AgentId, GoalId, MissionId, SessionId};
use crate::metadata::AgentMetadata;
use crate::models::configuration::AgentConfiguration;
use crate::models::execution::ExecutionTrace;
use crate::models::permissions::ToolPermission;
use crate::models::policy::AgentPolicy;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub id: AgentId,
    pub kind: AgentKind,
    pub name: String,
    pub description: String,
    pub capabilities: Vec<CapabilityProfile>,
    pub metadata: AgentMetadata,
    pub policies: AgentPolicy,
    pub configuration: AgentConfiguration,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentInstance {
    pub definition: AgentDefinition,
    pub context: AgentContext,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct WorkingMemoryState {
    pub size_bytes: u64,
    pub active_items: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct KnowledgeState {
    pub active_nodes: u32,
    pub active_edges: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct ToolPermissions {
    pub allowed_tools: Vec<ToolPermission>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentContext {
    pub session_id: SessionId,
    pub mission_id: MissionId,
    pub active_goal: Option<GoalId>,
    pub execution_trace: ExecutionTrace,
    pub working_memory_snapshot: WorkingMemoryState,
    pub knowledge_snapshot: KnowledgeState,
    pub tool_permissions: ToolPermissions,
    pub runtime_metadata: AgentMetadata,
}

impl Default for AgentContext {
    fn default() -> Self {
        Self {
            session_id: SessionId::new(),
            mission_id: MissionId::new(),
            active_goal: None,
            execution_trace: ExecutionTrace::default(),
            working_memory_snapshot: WorkingMemoryState::default(),
            knowledge_snapshot: KnowledgeState::default(),
            tool_permissions: ToolPermissions::default(),
            runtime_metadata: AgentMetadata::default(),
        }
    }
}
