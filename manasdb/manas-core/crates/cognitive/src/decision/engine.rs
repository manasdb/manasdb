use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::decision::models::Decision;
use crate::belief::models::Belief;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionResult {
    pub decision: Decision,
    pub alternatives: Vec<Decision>,
    pub rejected: Vec<Decision>,
    pub confidence: f32,
    pub reason: String,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for DecisionResult {
    fn confidence(&self) -> Option<f32> {
        Some(self.confidence)
    }
    
    fn metadata(&self) -> &EngineMetadata {
        &self.metadata
    }
    
    fn warnings(&self) -> &[Warning] {
        &self.warnings
    }
}

#[async_trait::async_trait]
pub trait DecisionEngine: CognitiveEngine<Input = Vec<Belief>, Output = DecisionResult> {}
