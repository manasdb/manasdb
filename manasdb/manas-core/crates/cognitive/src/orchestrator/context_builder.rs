use crate::core::context::{EngineContext, PlatformVersion};
use std::collections::HashMap;
use uuid::Uuid;

pub struct EngineContextBuilder {
    request_id: Uuid,
    trace_id: Uuid,
    execution_id: Uuid,
    namespace: String,
    runtime_version: PlatformVersion,
    metadata: HashMap<String, serde_json::Value>,
}

impl EngineContextBuilder {
    pub fn new() -> Self {
        Self {
            request_id: Uuid::new_v4(),
            trace_id: Uuid::new_v4(),
            execution_id: Uuid::new_v4(),
            namespace: "default".to_string(),
            runtime_version: PlatformVersion::default(),
            metadata: HashMap::new(),
        }
    }
    
    pub fn with_request_id(mut self, id: Uuid) -> Self {
        self.request_id = id;
        self
    }
    
    pub fn build(self) -> EngineContext {
        EngineContext {
            request_id: self.request_id,
            trace_id: self.trace_id,
            execution_id: self.execution_id,
            namespace: self.namespace,
            runtime_version: self.runtime_version,
            metadata: self.metadata,
        }
    }
}
