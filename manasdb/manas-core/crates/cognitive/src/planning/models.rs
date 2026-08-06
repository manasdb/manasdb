use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Goal {
    pub id: uuid::Uuid,
    pub description: String,
    pub priority: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub id: uuid::Uuid,
    pub name: String,
    pub parameters: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub id: uuid::Uuid,
    pub goal_id: uuid::Uuid,
    pub actions: Vec<Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRequest {
    pub id: uuid::Uuid,
    pub task_type: String,
    pub payload: String,
}

impl Goal {
    pub fn new(description: impl Into<String>, priority: u32) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            description: description.into(),
            priority,
        }
    }
}
