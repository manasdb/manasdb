use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reflection {
    pub id: uuid::Uuid,
    pub topic: String,
    pub summary: String,
    pub source_events: Vec<uuid::Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningEvent {
    pub id: uuid::Uuid,
    pub key_takeaway: String,
    pub adjusted_policy_id: Option<uuid::Uuid>,
}

impl Reflection {
    pub fn new(topic: impl Into<String>, summary: impl Into<String>, source_events: Vec<uuid::Uuid>) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            topic: topic.into(),
            summary: summary.into(),
            source_events,
        }
    }
}
