use std::sync::Arc;
use std::collections::HashMap;
use std::time::Duration;

use cognitive::orchestrator::CognitiveOrchestrator;
use cognitive::registry::CapabilityRegistry;
use cognitive::context::{WorkingMemory, FifoEvictionPolicy};
use cognitive::workflow::{WorkflowBuilder, WorkflowNode, RetryPolicy, ExecutionOutcomeType};
use cognitive::core::traits::CapabilityId;
use cognitive::core::types::Stimulus;
use cognitive::salience::DefaultSalienceEngine;

#[tokio::test]
async fn test_end_to_end_cognitive_workflow() {
    // Setup registry
    let registry = Arc::new(CapabilityRegistry::default_registry());
    
    // Setup salience
    let salience_engine = Arc::new(DefaultSalienceEngine);

    // Setup orchestrator
    let mut orchestrator = CognitiveOrchestrator::new(registry, salience_engine);
    
    // Setup working memory
    let mut memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    
    // Setup workflow: Observe -> Interpret -> Reason -> Plan
    let mut n1 = WorkflowNode {
        id: "n1".to_string(),
        capability: CapabilityId::Observe,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    n1.next.insert(ExecutionOutcomeType::Continue, "n2".to_string());
    
    let mut n2 = WorkflowNode {
        id: "n2".to_string(),
        capability: CapabilityId::Interpret,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    n2.next.insert(ExecutionOutcomeType::Continue, "n3".to_string());

    let mut n3 = WorkflowNode {
        id: "n3".to_string(),
        capability: CapabilityId::Reasoning,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    n3.next.insert(ExecutionOutcomeType::Continue, "n4".to_string());

    let n4 = WorkflowNode {
        id: "n4".to_string(),
        capability: CapabilityId::Planning,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };

    let workflow = WorkflowBuilder::new("e2e_workflow")
        .add_node(n1)
        .add_node(n2)
        .add_node(n3)
        .add_node(n4)
        .build()
        .expect("Valid workflow");
    
    let stimulus = Stimulus::Text("System is reporting high latency".to_string());
    
    let result = orchestrator.process_stimulus(stimulus, workflow, &mut memory).await;
    
    assert!(result.is_ok(), "End to end workflow failed: {:?}", result.err());
}
