use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::reflection::models::{Reflection, LearningEvent};
use crate::belief::models::Belief;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningResult {
    pub learning_events: Vec<LearningEvent>,
    pub belief_updates: Vec<Belief>,
    pub policy_suggestions: Vec<String>,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for LearningResult {
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
pub trait LearningEngine: CognitiveEngine<Input = Reflection, Output = LearningResult> {}
