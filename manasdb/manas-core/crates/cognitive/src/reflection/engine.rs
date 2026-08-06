use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::reflection::models::Reflection;
use crate::belief::models::MemoryDelta;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReflectionResult {
    pub reflection: Reflection,
    pub insights: Vec<String>,
    pub weaknesses: Vec<String>,
    pub optimization_suggestions: Vec<String>,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for ReflectionResult {
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
pub trait ReflectionEngine: CognitiveEngine<Input = Vec<MemoryDelta>, Output = ReflectionResult> {}
