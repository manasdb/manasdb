use std::sync::Arc;
use std::collections::HashMap;
use std::time::Duration;

use cognitive::orchestrator::CognitiveOrchestrator;
use cognitive::registry::CapabilityRegistry;
use cognitive::context::{WorkingMemory, FifoEvictionPolicy};
use cognitive::workflow::{WorkflowBuilder, WorkflowNode, RetryPolicy};
use cognitive::core::traits::CapabilityId;
use cognitive::core::types::Stimulus;
use cognitive::salience::DefaultSalienceEngine;

#[tokio::test]
async fn test_telemetry_capture() {
    let registry = Arc::new(CapabilityRegistry::default_registry());
    let salience_engine = Arc::new(DefaultSalienceEngine);
    let mut orchestrator = CognitiveOrchestrator::new(registry, salience_engine);
    let mut memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    
    let n1 = WorkflowNode {
        id: "telemetry_step".to_string(),
        capability: CapabilityId::Observe,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };

    let workflow = WorkflowBuilder::new("telemetry_flow")
        .add_node(n1)
        .build()
        .unwrap();
    
    let stimulus = Stimulus::Text("Valid input".to_string());
    
    let result = orchestrator.process_stimulus(stimulus, workflow, &mut memory).await;
    
    assert!(result.is_ok());
    let cog_res_opt = result.unwrap();
    assert!(cog_res_opt.is_some());
    let cog_res = cog_res_opt.unwrap();
    
    // Telemetry trace must be recorded
    assert_eq!(cog_res.execution_trace.executed_nodes.len(), 1);
    assert_eq!(cog_res.execution_trace.executed_nodes[0], "telemetry_step");
    assert!(cog_res.execution_trace.duration_ms > 0);
    
    // The engine's result telemetry is in telemetry node output

}
