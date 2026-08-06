use crate::errors::PipelineError;
use crate::execution::context::ExecutionContext;
use crate::types::PipelineData;
use async_trait::async_trait;

#[async_trait]
pub trait PipelineStage: Send + Sync {
    /// Returns the unique string identifier for this stage instance (e.g. "WhitespaceTokenizer")
    fn id(&self) -> &str;

    /// The core execution logic for the stage. 
    /// The stage takes PipelineData and an ExecutionContext, and produces new PipelineData.
    async fn execute(
        &self,
        data: PipelineData,
        context: &ExecutionContext,
    ) -> Result<PipelineData, PipelineError>;
}
