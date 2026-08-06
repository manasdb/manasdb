use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyViolation {
    pub id: uuid::Uuid,
    pub policy_name: String,
    pub reason: String,
}

impl PolicyViolation {
    pub fn new(policy_name: impl Into<String>, reason: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            policy_name: policy_name.into(),
            reason: reason.into(),
        }
    }
}
