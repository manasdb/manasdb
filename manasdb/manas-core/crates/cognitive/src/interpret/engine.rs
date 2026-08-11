use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::observe::models::Observation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterpretationResult {
    pub knowledge_facts: crate::knowledge::models::KnowledgeFacts,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for InterpretationResult {
    fn confidence(&self) -> Option<f32> {
        None
    }
    
    fn metadata(&self) -> &EngineMetadata {
        &self.metadata
    }
    
    fn warnings(&self) -> &[Warning] {
        &self.warnings
    }
}

#[async_trait::async_trait]
pub trait InterpretationEngine: CognitiveEngine<Input = Observation, Output = InterpretationResult> {}
