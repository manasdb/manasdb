use crate::errors::RuntimeError;
use crate::types::ExecutionResult;
use pipeline::execution::{Execution, PipelineExecutor};
use pipeline::stage::StageRegistry;
use std::sync::Arc;

pub struct ExecutionManager {
    executor: PipelineExecutor,
}

impl ExecutionManager {
    pub fn new(registry: Arc<StageRegistry>) -> Self {
        Self {
            executor: PipelineExecutor::new(registry),
        }
    }

    pub async fn run(&self, execution: Execution) -> Result<ExecutionResult, RuntimeError> {
        let execution_id = execution.id.clone();
        
        // In a real implementation we would record start time
        // and handle timeouts and retries here.
        // let start_time = Instant::now();
        
        let pipeline_result = self.executor.execute(execution).await?;
        
        // let duration = start_time.elapsed().as_millis() as u64;
        let duration = 0; // Mock duration

        Ok(ExecutionResult {
            execution_id,
            pipeline_data: pipeline_result,
            duration_ms: duration,
            metrics: Default::default(),
            cancelled: false,
        })
    }
}
