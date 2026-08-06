use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use crate::core::errors::CognitiveError;
use crate::planning::models::Plan;
use crate::belief::BeliefUpdate;
use crate::reasoning::models::Hypothesis;
use crate::reflection::ReflectionResult;
use crate::learning::LearningResult;
use crate::core::errors::Warning;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Stimulus {
    Text(String),
    Document(serde_json::Value), // Placeholder for actual Document type
    Image(serde_json::Value),    // Placeholder for actual Image type
    Audio(serde_json::Value),    // Placeholder for actual Audio type
    Structured(serde_json::Value),
    Memory(serde_json::Value),   // Placeholder for Memory type
    Event(serde_json::Value),    // Placeholder for RuntimeEvent type
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionTrace {
    pub executed_nodes: Vec<String>,
    pub duration_ms: u64,
    pub warnings: Vec<Warning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryData {
    pub overall_duration_ms: u64,
    pub start_timestamp: u64,
    pub total_tokens_used: u32,
    pub estimated_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CognitiveResult {
    pub plan: Option<Plan>,
    pub belief_update: Option<BeliefUpdate>,
    pub hypotheses: Option<Vec<Hypothesis>>,
    pub reflection: Option<ReflectionResult>,
    pub learning: Option<LearningResult>,
    pub telemetry: TelemetryData,
    pub metadata: HashMap<String, serde_json::Value>,
    pub execution_trace: ExecutionTrace,
}

#[derive(Debug)]
pub enum ExecutionOutcome<T> {
    Continue(T),
    Retry(CognitiveError),
    Skip,
    Abort(CognitiveError),
}
