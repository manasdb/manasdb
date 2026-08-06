use serde::{Serialize, Deserialize};
use super::traits::CapabilityId;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineMetadata {
    pub capability: CapabilityId,
    pub duration_ms: u64,
    pub provider: String,
    pub model: Option<String>,
    pub tokens_in: Option<u32>,
    pub tokens_out: Option<u32>,
    pub cached_tokens: Option<u32>,
    pub reasoning_tokens: Option<u32>,
    pub cost: Option<f64>,
    pub finish_reason: Option<String>,
}

impl EngineMetadata {
    pub fn new(capability: CapabilityId, duration_ms: u64, provider: impl Into<String>) -> Self {
        Self {
            capability,
            duration_ms,
            provider: provider.into(),
            model: None,
            tokens_in: None,
            tokens_out: None,
            cached_tokens: None,
            reasoning_tokens: None,
            cost: None,
            finish_reason: None,
        }
    }
}
