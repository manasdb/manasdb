use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::reflection::models::LearningEvent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryState {
    pub events: Vec<LearningEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEvolutionResult {
    pub consolidated: usize,
    pub pruned: usize,
    pub compacted: usize,
    pub merged: usize,
    pub decayed: usize,
    pub promoted: usize,
    pub archived: usize,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for MemoryEvolutionResult {
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
pub trait MemoryEvolutionEngine: CognitiveEngine<Input = MemoryState, Output = MemoryEvolutionResult> {}
