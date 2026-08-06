use serde::{Serialize, Deserialize};
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Belief {
    pub id: uuid::Uuid,
    pub concept: String,
    pub truth_value: f32,
    pub last_updated: SystemTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryDelta {
    pub belief_id: uuid::Uuid,
    pub previous_truth_value: f32,
    pub new_truth_value: f32,
}

impl Belief {
    pub fn new(concept: impl Into<String>, truth_value: f32) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            concept: concept.into(),
            truth_value,
            last_updated: SystemTime::now(),
        }
    }
}
