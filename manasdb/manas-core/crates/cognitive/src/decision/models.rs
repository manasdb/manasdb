use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Decision {
    pub id: uuid::Uuid,
    pub action_name: String,
    pub priority: u32,
    pub reason: String,
}

impl Decision {
    pub fn new(action_name: impl Into<String>, priority: u32, reason: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            action_name: action_name.into(),
            priority,
            reason: reason.into(),
        }
    }
}
