use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Task {
    pub id: String,
    pub priority: u8,
    pub deadline: Option<u64>,
    pub retry_count: u8,
    pub timeout_ms: Option<u64>,
    pub metadata: HashMap<String, String>,
}
