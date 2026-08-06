use serde::{Serialize, Deserialize};
use crate::core::{CognitiveEngine, EngineResult, EngineMetadata, Warning};
use crate::planning::models::{Plan, Goal};
use crate::decision::models::Decision;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanningInput {
    pub decision: Decision,
    pub goal: Goal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanningResult {
    pub plan: Plan,
    pub estimated_cost: Option<f64>,
    pub estimated_duration_ms: Option<u64>,
    pub risks: Vec<String>,
    pub dependencies: Vec<String>,
    pub metadata: EngineMetadata,
    pub warnings: Vec<Warning>,
}

impl EngineResult for PlanningResult {
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
pub trait PlanningEngine: CognitiveEngine<Input = PlanningInput, Output = PlanningResult> {}
