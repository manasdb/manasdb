use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::belief::models::{Belief, MemoryDelta};
use crate::reasoning::models::Hypothesis;
use crate::interpret::models::Evidence;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeliefInput {
    pub existing_beliefs: Vec<Belief>,
    pub hypotheses: Vec<Hypothesis>,
    pub evidence: Vec<Evidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BeliefUpdate {
    pub created: Vec<Belief>,
    pub updated: Vec<Belief>,
    pub removed: Vec<uuid::Uuid>,
    pub conflicts: Vec<String>,
    pub confidence_changes: Vec<MemoryDelta>,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for BeliefUpdate {
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
pub trait BeliefEngine: CognitiveEngine<Input = BeliefInput, Output = BeliefUpdate> {}
