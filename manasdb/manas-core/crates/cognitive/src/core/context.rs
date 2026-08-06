use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlatformVersion {
    SemVer(String),
    Hash(String),
}

impl Default for PlatformVersion {
    fn default() -> Self {
        Self::SemVer("0.1.0".to_string())
    }
}

pub struct EngineContext {
    pub request_id: uuid::Uuid,
    pub trace_id: uuid::Uuid,
    pub execution_id: uuid::Uuid,
    pub namespace: String, // TODO: Use memory::NamespacePath when available
    pub runtime_version: PlatformVersion,
    pub metadata: std::collections::HashMap<String, serde_json::Value>,
}

impl Default for EngineContext {
    fn default() -> Self {
        Self {
            request_id: uuid::Uuid::new_v4(),
            trace_id: uuid::Uuid::new_v4(),
            execution_id: uuid::Uuid::new_v4(),
            namespace: "default".to_string(),
            runtime_version: PlatformVersion::default(),
            metadata: std::collections::HashMap::new(),
        }
    }
}
