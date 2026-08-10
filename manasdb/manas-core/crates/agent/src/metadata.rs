use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AgentMetadata {
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub owner: Option<String>,
    pub namespace: String,
    pub labels: HashMap<String, String>,
    pub description: Option<String>,
    pub version: String,
}

impl Default for AgentMetadata {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            created_at: now,
            updated_at: now,
            owner: None,
            namespace: "default".to_string(),
            labels: HashMap::new(),
            description: None,
            version: "1.0.0".to_string(),
        }
    }
}
