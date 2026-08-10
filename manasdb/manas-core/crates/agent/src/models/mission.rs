use crate::ids::{GoalId, MissionId};
use crate::lifecycle::MissionStatus;
use crate::metadata::AgentMetadata;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Mission {
    pub id: MissionId,
    pub title: String,
    pub description: String,
    pub goals: Vec<GoalId>,
    pub status: MissionStatus,
    pub metadata: AgentMetadata,
}

impl Default for Mission {
    fn default() -> Self {
        Self {
            id: MissionId::new(),
            title: String::new(),
            description: String::new(),
            goals: Vec::new(),
            status: MissionStatus::Pending,
            metadata: AgentMetadata::default(),
        }
    }
}
