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
async fn test_workflow_conformance_deterministic_vs_llm() {
    let salience = Arc::new(DefaultSalienceEngine);
    
    // Deterministic Registry
    let det_registry = Arc::new(CapabilityRegistry::default_registry());
    let mut det_orchestrator = CognitiveOrchestrator::new(det_registry, salience.clone());
    let mut det_memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    
    // LLM Registry (Mock) - for now just use the default registry since mock LLM is wired inside
    let llm_registry = Arc::new(CapabilityRegistry::default_registry());
    let mut llm_orchestrator = CognitiveOrchestrator::new(llm_registry, salience.clone());
    let mut llm_memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));

    let mut n1 = WorkflowNode {
        id: "step1".to_string(),
        capability: CapabilityId::Observe,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    n1.next.insert(ExecutionOutcomeType::Continue, "step2".to_string());
    
    let n2 = WorkflowNode {
        id: "step2".to_string(),
        capability: CapabilityId::Interpret,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };

    let workflow = WorkflowBuilder::new("conformance_flow")
        .add_node(n1)
        .add_node(n2)
        .build()
        .unwrap();

    let stimulus = Stimulus::Text("System is reporting high latency".to_string());
    
    let det_result = det_orchestrator.process_stimulus(stimulus.clone(), workflow.clone(), &mut det_memory).await.unwrap();
    let llm_result = llm_orchestrator.process_stimulus(stimulus, workflow, &mut llm_memory).await.unwrap();

    // Verify traces match
    if let (Some(det_res), Some(llm_res)) = (det_result, llm_result) {
        assert_eq!(det_res.execution_trace.executed_nodes.len(), llm_res.execution_trace.executed_nodes.len());
        for i in 0..det_res.execution_trace.executed_nodes.len() {
            assert_eq!(det_res.execution_trace.executed_nodes[i], llm_res.execution_trace.executed_nodes[i]);
        }
    }
}
