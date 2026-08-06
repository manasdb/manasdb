use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::observe::models::Observation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObserveResult {
    pub observation: Observation,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for ObserveResult {
    fn confidence(&self) -> Option<f32> {
        None // Observations might not have a generic confidence score natively, but could.
    }
    
    fn metadata(&self) -> &EngineMetadata {
        &self.metadata
    }
    
    fn warnings(&self) -> &[Warning] {
        &self.warnings
    }
}

#[async_trait::async_trait]
pub trait ObservationEngine: CognitiveEngine<Input = String, Output = ObserveResult> {}
