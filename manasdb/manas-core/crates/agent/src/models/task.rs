use crate::ids::TaskId;
use crate::lifecycle::TaskStatus;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Priority {
    Lowest,
    Low,
    Normal,
    High,
    Critical,
}

impl Default for Priority {
    fn default() -> Self {
        Self::Normal
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Task {
    pub id: TaskId,
    pub title: String,
    pub description: String,
    pub dependencies: Vec<TaskId>,
    pub priority: Priority,
    pub estimated_cost: Option<u64>,
    pub status: TaskStatus,
}

impl Default for Task {
    fn default() -> Self {
        Self {
            id: TaskId::new(),
            title: String::new(),
            description: String::new(),
            dependencies: Vec::new(),
            priority: Priority::Normal,
            estimated_cost: None,
            status: TaskStatus::Pending,
        }
    }
}
