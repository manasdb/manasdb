use crate::config::RuntimeConfig;
use crate::lifecycle::RuntimeState;
use crate::runtime::ManasRuntime;
use pipeline::execution::{ExecutionContext, PipelineBuilder};
use pipeline::stage::StageRegistry;
use pipeline::types::PipelineData;
use std::sync::Arc;

#[tokio::test]
async fn test_runtime_lifecycle() {
    let registry = Arc::new(StageRegistry::new());
    let mut runtime = ManasRuntime::new(RuntimeConfig::default(), registry);

    assert_eq!(runtime.state, RuntimeState::Uninitialized);
    
    runtime.initialize();
    assert_eq!(runtime.state, RuntimeState::Initialized);

    runtime.start();
    assert_eq!(runtime.state, RuntimeState::Ready);

    runtime.shutdown();
    assert_eq!(runtime.state, RuntimeState::Shutdown);
}

#[tokio::test]
async fn test_runtime_execution() {
    let registry = Arc::new(StageRegistry::new());
    let mut runtime = ManasRuntime::new(RuntimeConfig::default(), registry.clone());

    runtime.initialize();
    runtime.start(); // transitions to Ready

    let definition = PipelineBuilder::new("MockPipeline").build();
    let compiler = pipeline::execution::PipelineCompiler::new(&registry);
    let context = ExecutionContext::new();
    let input = PipelineData::empty();
    
    let execution = compiler.compile(definition, input, context).unwrap();

    let result = runtime.execute(execution).await.expect("Execution failed");
    
    // Result should reflect what happened in execution (in this case, empty data passed through)
    assert!(result.duration_ms == 0); // Mock duration is 0
    assert_eq!(result.cancelled, false);
}
