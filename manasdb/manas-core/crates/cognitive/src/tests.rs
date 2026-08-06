use std::sync::Arc;
use async_trait::async_trait;

use crate::orchestrator::CognitiveOrchestrator;
use crate::registry::CapabilityRegistry;
use crate::context::SessionContext;
use crate::state::CognitiveState;
use crate::providers::{ObserveProvider, InterpretProvider};
use crate::errors::CognitiveError;

struct MockObserveProvider;

#[async_trait]
impl ObserveProvider for MockObserveProvider {
    async fn observe(&self, input: &str) -> Result<String, CognitiveError> {
        Ok(format!("Observed: {}", input))
    }
}

struct MockInterpretProvider;

#[async_trait]
impl InterpretProvider for MockInterpretProvider {
    async fn interpret(&self, observation: &str) -> Result<String, CognitiveError> {
        Ok(format!("Interpreted: {}", observation))
    }
}

#[tokio::test]
async fn test_orchestrator_initialization() {
    let mut registry = CapabilityRegistry::new();
    registry.observe_providers.push(Arc::new(MockObserveProvider));
    registry.interpret_providers.push(Arc::new(MockInterpretProvider));

    let context = SessionContext::default();
    
    let mut orchestrator = CognitiveOrchestrator::new(Arc::new(registry), context);

    assert_eq!(orchestrator.state_machine.current_state, CognitiveState::Idle);

    orchestrator.state_machine.transition_to(CognitiveState::Observing);
    assert_eq!(orchestrator.state_machine.current_state, CognitiveState::Observing);
}

#[tokio::test]
async fn test_provider_execution() {
    let observer = MockObserveProvider;
    let interpreter = MockInterpretProvider;

    let obs = observer.observe("hello").await.unwrap();
    assert_eq!(obs, "Observed: hello");

    let int = interpreter.interpret(&obs).await.unwrap();
    assert_eq!(int, "Interpreted: Observed: hello");
}

use std::collections::HashMap;
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
