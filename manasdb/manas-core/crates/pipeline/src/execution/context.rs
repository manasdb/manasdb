use std::collections::HashMap;
use uuid::Uuid;
// In real use, we'd use a CancellationToken from tokio-util, but for now we'll mock it.
// use tokio_util::sync::CancellationToken;

#[derive(Debug, Clone)]
pub struct ExecutionContext {
    pub request_id: String,
    pub trace_id: String,
    pub span_id: String,
    pub deadline: Option<u64>, // Placeholder for timestamp
    pub metadata: HashMap<String, String>,
    pub cancellation_token: (), // Mock cancellation token for now
}

impl ExecutionContext {
    pub fn new() -> Self {
        Self {
            request_id: Uuid::new_v4().to_string(),
            trace_id: Uuid::new_v4().to_string(),
            span_id: Uuid::new_v4().to_string(),
            deadline: None,
            metadata: HashMap::new(),
            cancellation_token: (),
        }
    }
}
