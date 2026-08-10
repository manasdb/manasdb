use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ToolPermission {
    ReadMemory,
    WriteMemory,
    ReadKnowledge,
    WriteKnowledge,
    ExecuteTool(String),
    Network,
    Filesystem,
    Custom(String),
}
