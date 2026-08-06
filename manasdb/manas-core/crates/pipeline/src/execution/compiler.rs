use crate::errors::PipelineError;
use crate::execution::context::ExecutionContext;
use crate::execution::definition::PipelineDefinition;
use crate::execution::execution::Execution;
use crate::stage::StageRegistry;
use crate::types::PipelineData;

pub struct PipelineCompiler<'a> {
    registry: &'a StageRegistry,
}

impl<'a> PipelineCompiler<'a> {
    pub fn new(registry: &'a StageRegistry) -> Self {
        Self { registry }
    }

    pub fn compile(
        &self,
        definition: PipelineDefinition,
        input: PipelineData,
        context: ExecutionContext,
    ) -> Result<Execution, PipelineError> {
        // Validate that all stages exist in the registry
        for stage_id in &definition.stage_ids {
            if self.registry.resolve(stage_id).is_none() {
                return Err(PipelineError::CompilationFailed(format!(
                    "Stage {} not found in registry",
                    stage_id
                )));
            }
        }

        // Additional validation (e.g., dependency order, duplicate stages) could be added here.

        Ok(Execution::new(definition, context, input))
    }
}
