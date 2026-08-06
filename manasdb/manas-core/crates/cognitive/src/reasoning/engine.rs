use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::interpret::models::{Fact, Evidence};
use crate::reasoning::models::Hypothesis;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningResult {
    pub facts: Vec<Fact>,
    pub hypotheses: Vec<Hypothesis>,
    pub confidence: Option<f32>,
    pub evidence: Vec<Evidence>,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for ReasoningResult {
    fn confidence(&self) -> Option<f32> {
        self.confidence
    }
    
    fn metadata(&self) -> &EngineMetadata {
        &self.metadata
    }
    
    fn warnings(&self) -> &[Warning] {
        &self.warnings
    }
}

#[async_trait::async_trait]
pub trait ReasoningEngine: CognitiveEngine<Input = Vec<Fact>, Output = ReasoningResult> {}
