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
async fn test_stress_concurrent_workflows() {
    let registry = Arc::new(CapabilityRegistry::default_registry());
    let salience_engine = Arc::new(DefaultSalienceEngine);
    
    let mut tasks = vec![];
    
    // Launch 10 concurrent orchestrators
    for i in 0..10 {
        let registry = registry.clone();
        let salience_engine = salience_engine.clone();
        
        let task = tokio::spawn(async move {
            let mut orchestrator = CognitiveOrchestrator::new(registry, salience_engine);
            let mut memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
            
            let n1 = WorkflowNode {
                id: "n1".to_string(),
                capability: CapabilityId::Observe,
                configuration: HashMap::new(),
                retry_policy: RetryPolicy::default(),
                timeout: Duration::from_secs(1),
                next: HashMap::new(),
            };
        
            let workflow = WorkflowBuilder::new(&format!("flow_{}", i))
                .add_node(n1)
                .build()
                .unwrap();
                
            let stimulus = Stimulus::Text("Concurrent execution".to_string());
            
            let result = orchestrator.process_stimulus(stimulus, workflow, &mut memory).await;
            result
        });
        tasks.push(task);
    }
    
    for task in tasks {
        let inner = task.await.unwrap();
        assert!(inner.is_ok());
    }
}
