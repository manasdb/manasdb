use crate::errors::PipelineError;
use crate::execution::execution::Execution;
use crate::stage::StageRegistry;
use crate::types::PipelineData;
use std::sync::Arc;

pub struct PipelineExecutor {
    registry: Arc<StageRegistry>,
}

impl PipelineExecutor {
    pub fn new(registry: Arc<StageRegistry>) -> Self {
        Self { registry }
    }

    pub async fn execute(&self, mut execution: Execution) -> Result<PipelineData, PipelineError> {
        let mut current_data = execution.input.clone();

        for stage_id in &execution.definition.stage_ids {
            // We already validated in compiler, but we must resolve again.
            let stage = self.registry.resolve(stage_id).ok_or_else(|| {
                PipelineError::ExecutionFailed(format!("Stage {} disappeared during execution", stage_id))
            })?;

            // Note: We'd check cancellation_token here if we were using a real tokio CancellationToken
            
            // Execute the stage
            current_data = stage.execute(current_data, &execution.context).await?;
        }

        Ok(current_data)
    }
}
