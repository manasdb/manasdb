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
