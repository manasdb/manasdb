use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct WorkflowContext {
    pub retry_count: u32,
    pub workflow_state: String,
    pub execution_ids: Vec<String>,
    pub node_outputs: HashMap<String, serde_json::Value>,
}

impl WorkflowContext {
    pub fn new() -> Self {
        Self::default()
    }
}
