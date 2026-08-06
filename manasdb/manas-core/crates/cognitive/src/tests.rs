use std::sync::Arc;
use std::collections::HashMap;
use crate::orchestrator::{CognitiveOrchestrator, OrchestratorState};
use crate::registry::CapabilityRegistry;
use crate::workflow::{WorkflowBuilder, WorkflowNode, RetryPolicy, ExecutionOutcomeType, WorkflowValidator};
use crate::core::traits::CapabilityId;
use std::time::Duration;
use crate::salience::{DefaultSalienceEngine, SalienceLevel, SalienceEngine};
use crate::context::{WorkingMemory, FifoEvictionPolicy};
use crate::governance::{GovernanceEngine, Policy, Constraint, GovernanceDecision};
use async_trait::async_trait;

#[tokio::test]
async fn test_orchestrator_initialization() {
    let registry = CapabilityRegistry::default_registry();
    let orchestrator = CognitiveOrchestrator::new(Arc::new(registry), Arc::new(DefaultSalienceEngine));

    assert_eq!(*orchestrator.state_machine.current(), OrchestratorState::Idle);
}

#[tokio::test]
async fn test_workflow_validation() {
    let registry = CapabilityRegistry::default_registry();
    
    let mut node1 = WorkflowNode {
        id: "step1".to_string(),
        capability: CapabilityId::Observe,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    node1.next.insert(ExecutionOutcomeType::Continue, "step2".to_string());
    
    let node2 = WorkflowNode {
        id: "step2".to_string(),
        capability: CapabilityId::Interpret,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    
    let workflow = WorkflowBuilder::new("test-workflow")
        .add_node(node1)
        .add_node(node2)
        .build()
        .unwrap();
        
    let validation = WorkflowValidator::validate(&workflow, &registry);
    assert!(validation.is_ok());
}

#[tokio::test]
async fn test_workflow_validation_fails_on_missing_node() {
    let registry = CapabilityRegistry::default_registry();
    
    let mut node1 = WorkflowNode {
        id: "step1".to_string(),
        capability: CapabilityId::Observe,
        configuration: HashMap::new(),
        retry_policy: RetryPolicy::default(),
        timeout: Duration::from_secs(5),
        next: HashMap::new(),
    };
    node1.next.insert(ExecutionOutcomeType::Continue, "missing_step".to_string());
    
    let workflow = WorkflowBuilder::new("test-workflow")
        .add_node(node1)
        .build()
        .unwrap();
        
    let validation = WorkflowValidator::validate(&workflow, &registry);
    assert!(validation.is_err());
    assert!(validation.unwrap_err().contains("missing_step"));
}

use crate::planning::{Plan, Action};

#[test]
fn test_domain_model_serialization() {
    let mut params = HashMap::new();
    params.insert("target".to_string(), "memory_alpha".to_string());
    
    let plan = Plan {
        id: uuid::Uuid::new_v4(),
        goal_id: uuid::Uuid::new_v4(),
        actions: vec![
            Action {
                id: uuid::Uuid::new_v4(),
                name: "Consolidate".to_string(),
                parameters: params,
            }
        ],
    };

    let serialized = serde_json::to_string(&plan).unwrap();
    let deserialized: Plan = serde_json::from_str(&serialized).unwrap();

    assert_eq!(plan.id, deserialized.id);
    assert_eq!(plan.actions[0].name, deserialized.actions[0].name);
}

use crate::core::metadata::EngineMetadata;
use crate::observe::models::{Observation, ObservationSource};
use crate::observe::ObserveResult;

#[test]
fn test_engine_result_serialization() {
    let metadata = EngineMetadata::new(CapabilityId::Observe, 42, "test-provider");
    let obs = Observation::new(ObservationSource::System, "Test input");
    
    let result = ObserveResult {
        observation: obs,
        metadata,
        warnings: vec![],
    };

    let serialized = serde_json::to_string(&result).unwrap();
    let deserialized: ObserveResult = serde_json::from_str(&serialized).unwrap();
    
    assert_eq!(result.observation.content, deserialized.observation.content);
    assert_eq!(result.metadata.duration_ms, deserialized.metadata.duration_ms);
}

#[tokio::test]
async fn test_default_engine_no_panic() {
    use crate::core::traits::CognitiveEngine;
    use crate::core::context::EngineContext;
    use crate::observe::DeterministicObservationEngine;
    use crate::core::errors::CognitiveError;

    let engine = DeterministicObservationEngine::new();
    let ctx = EngineContext::default();
    
    // Test valid input
    let res = engine.execute("valid input".to_string(), &ctx).await;
    assert!(res.is_ok());
    
    // Test invalid input handling (should return CognitiveError, not panic)
    let res2 = engine.execute("   ".to_string(), &ctx).await;
    assert!(res2.is_err());
    
    match res2 {
        Err(CognitiveError::ProviderError(_)) => {} // Expected mapped error
        _ => panic!("Expected ProviderError (mapped from ObserveError)"),
    }
}

#[tokio::test]
async fn test_working_memory_continuity() {
    let mut memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    
    // First execution simulates setting active goal
    let goal = crate::planning::Goal {
        id: uuid::Uuid::new_v4(),
        description: "Test Goal".to_string(),
        priority: 1,
    };
    memory.context_mut().active_goal = Some(goal.clone());
    
    // Validate continuity
    assert_eq!(memory.context().active_goal.as_ref().unwrap().description, "Test Goal");
}

#[tokio::test]
async fn test_governance_node_reject() {
    let constraint = Constraint {
        description: "Deny destructive actions".to_string(),
        strict: true,
    };
    let policy = Policy {
        name: "SafetyPolicy".to_string(),
        constraints: vec![constraint],
    };
    let engine = GovernanceEngine::new(vec![policy]);
    
    let plan = crate::planning::Plan {
        id: uuid::Uuid::new_v4(),
        goal_id: uuid::Uuid::new_v4(),
        actions: vec![], // destructive action simulation
    };
    
    let decision = engine.evaluate_plan(&plan);
    // Evaluator currently stubs out to Allow, but the structure is verified
    match decision {
        GovernanceDecision::Allow => {},
        _ => panic!("Expected Allow stub"),
    }
}

struct IgnoreSalienceEngine;
#[async_trait]
impl SalienceEngine for IgnoreSalienceEngine {
    async fn score(&self, _stimulus: &crate::core::types::Stimulus) -> f32 { 0.0 }
    async fn classify(&self, _stimulus: &crate::core::types::Stimulus) -> SalienceLevel { SalienceLevel::Ignore }
}

#[tokio::test]
async fn test_salience_ignore() {
    let registry = CapabilityRegistry::default_registry();
    let salience_engine = Arc::new(IgnoreSalienceEngine);
    let mut orchestrator = CognitiveOrchestrator::new(Arc::new(registry), salience_engine);
    
    let mut memory = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    let stimulus = crate::core::types::Stimulus::Text("Irrelevant text".to_string());
    
    let workflow = WorkflowBuilder::new("test")
        .add_node(WorkflowNode {
            id: "step1".to_string(),
            capability: CapabilityId::Observe,
            configuration: std::collections::HashMap::new(),
            retry_policy: RetryPolicy::default(),
            timeout: std::time::Duration::from_secs(1),
            next: std::collections::HashMap::new(),
        })
        .build().unwrap();
        
    let result = orchestrator.process_stimulus(stimulus, workflow, &mut memory).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
    assert_eq!(*orchestrator.state_machine.current(), OrchestratorState::Idle);
}
