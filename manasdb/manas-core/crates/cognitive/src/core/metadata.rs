use serde::{Serialize, Deserialize};
use super::traits::CapabilityId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineMetadata {
    pub capability: CapabilityId,
    pub duration_ms: u64,
    pub provider: String,
    pub model: Option<String>,
    pub tokens: Option<u32>,
    pub cost: Option<f64>,
}

impl EngineMetadata {
    pub fn new(capability: CapabilityId, duration_ms: u64, provider: impl Into<String>) -> Self {
        Self {
            capability,
            duration_ms,
            provider: provider.into(),
            model: None,
            tokens: None,
            cost: None,
        }
    }
}
