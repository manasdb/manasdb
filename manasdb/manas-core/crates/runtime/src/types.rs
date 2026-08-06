use pipeline::types::PipelineData;
use std::collections::HashMap;

#[derive(Debug)]
pub struct ExecutionResult {
    pub execution_id: String,
    pub pipeline_data: PipelineData,
    pub duration_ms: u64,
    pub metrics: HashMap<String, u64>,
    pub cancelled: bool,
}
