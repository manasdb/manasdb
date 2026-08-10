use crate::ids::GoalId;
use crate::lifecycle::GoalStatus;
use crate::models::task::Priority;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Constraint {
    Deadline(chrono::DateTime<chrono::Utc>),
    Dependency(GoalId),
    Budget(crate::models::execution::ResourceBudget),
    Policy(String),
    CapabilityRequirement(crate::capabilities::AgentCapability),
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Goal {
    pub id: GoalId,
    pub title: String,
    pub description: String,
    pub priority: Priority,
    pub status: GoalStatus,
    pub parent_goal: Option<GoalId>,
    pub constraints: Vec<Constraint>,
    pub success_conditions: Vec<String>,
}

impl Default for Goal {
    fn default() -> Self {
        Self {
            id: GoalId::new(),
            title: String::new(),
            description: String::new(),
            priority: Priority::Normal,
            status: GoalStatus::Pending,
            parent_goal: None,
            constraints: Vec::new(),
            success_conditions: Vec::new(),
        }
    }
}
