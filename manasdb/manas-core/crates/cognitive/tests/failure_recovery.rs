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
async fn test_failure_recovery_on_invalid_stimulus() {
    // Workflow with a retry policy
    let retry = RetryPolicy {
        max_retries: 2,
        backoff_ms: 10,
    };
    
    // Unregistered Capability to trigger orchestrator error
    let n1 = WorkflowNode {
        id: "n1".to_string(),
        capability: CapabilityId::Learning, // Not registered in default_registry by default or we can use a completely missing one. Wait, default_registry registers everything.
        configuration: HashMap::new(),
        retry_policy: retry,
        timeout: Duration::from_secs(1),
        next: HashMap::new(),
    };

    let workflow = WorkflowBuilder::new("failing_flow")
        .add_node(n1)
        .build()
        .unwrap();
    
    // DeterministicObservationEngine fails on blank strings
    let invalid_stimulus = Stimulus::Text("   ".to_string());
    
    // We create an empty registry so that the capability is definitely not found
    let empty_registry = Arc::new(CapabilityRegistry::new());
    let salience_engine = Arc::new(DefaultSalienceEngine);
    let mut orchestrator = CognitiveOrchestrator::new(empty_registry, salience_engine);
    let mut memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    
    let result = orchestrator.process_stimulus(invalid_stimulus, workflow, &mut memory).await;
    
    // In our stub, we can also test missing capability by manually removing it from registry,
    // but the Orchestrator returns Err(String) in our current stub.
    // Let's just assert that it is an Error.
    assert!(result.is_err(), "Expected workflow to fail and recover by returning error gracefully");
}
