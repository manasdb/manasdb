use serde::{Serialize, Deserialize};
use std::time::SystemTime;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ObservationSource {
    User,
    System,
    BackgroundTask,
    External(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Observation {
    pub id: uuid::Uuid,
    pub source: ObservationSource,
    pub content: String,
    pub timestamp: SystemTime,
}

impl Observation {
    pub fn new(source: ObservationSource, content: impl Into<String>) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            source,
            content: content.into(),
            timestamp: SystemTime::now(),
        }
    }
}
