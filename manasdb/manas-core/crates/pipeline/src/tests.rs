#[cfg(test)]
mod tests {
    use crate::errors::PipelineError;
    use crate::execution::{ExecutionContext, PipelineBuilder, PipelineCompiler, PipelineExecutor};
    use crate::stage::{PipelineStage, StageRegistry};
    use crate::types::PipelineData;
    use async_trait::async_trait;
    use std::sync::Arc;

    struct MockStage1;
    #[async_trait]
    impl PipelineStage for MockStage1 {
        fn id(&self) -> &str {
            "MockStage1"
        }

        async fn execute(
            &self,
            mut data: PipelineData,
            _context: &ExecutionContext,
        ) -> Result<PipelineData, PipelineError> {
            data.payload_bytes.push(1);
            Ok(data)
        }
    }

    struct MockStage2;
    #[async_trait]
    impl PipelineStage for MockStage2 {
        fn id(&self) -> &str {
            "MockStage2"
        }

        async fn execute(
            &self,
            mut data: PipelineData,
            _context: &ExecutionContext,
        ) -> Result<PipelineData, PipelineError> {
            data.payload_bytes.push(2);
            Ok(data)
        }
    }

    #[tokio::test]
    async fn test_pipeline_execution() {
        let mut registry = StageRegistry::new();
        registry.register(Arc::new(MockStage1), vec!["test/stage1".to_string()]);
        registry.register(Arc::new(MockStage2), vec!["test/stage2".to_string()]);

        let definition = PipelineBuilder::new("TestPipeline")
            .add_stage("MockStage1")
            .add_stage("MockStage2")
            .build();

        let compiler = PipelineCompiler::new(&registry);
        let context = ExecutionContext::new();
        let input = PipelineData::empty();

        let execution = compiler
            .compile(definition, input, context)
            .expect("Compilation failed");

        let executor = PipelineExecutor::new(Arc::new(registry));
        let output = executor.execute(execution).await.expect("Execution failed");

        assert_eq!(output.payload_bytes, vec![1, 2]);
    }
}
