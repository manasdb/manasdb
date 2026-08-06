use crate::execution::context::ExecutionContext;
use crate::execution::definition::PipelineDefinition;
use crate::types::PipelineData;
use std::collections::HashMap;

#[derive(Debug)]
pub struct Execution {
    pub id: String,
    pub pipeline_id: String,
    pub definition: PipelineDefinition,
    pub context: ExecutionContext,
    pub input: PipelineData,
    pub metadata: HashMap<String, String>,
}

impl Execution {
    pub fn new(
        definition: PipelineDefinition,
        context: ExecutionContext,
        input: PipelineData,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            pipeline_id: definition.id.clone(),
            definition,
            context,
            input,
            metadata: HashMap::new(),
        }
    }
}
