use crate::state::StateMachine;
use crate::context::SessionContext;
use crate::registry::CapabilityRegistry;
use std::sync::Arc;

pub struct CognitiveOrchestrator {
    pub state_machine: StateMachine,
    pub registry: Arc<CapabilityRegistry>,
    pub context: SessionContext,
}

impl CognitiveOrchestrator {
    pub fn new(registry: Arc<CapabilityRegistry>, context: SessionContext) -> Self {
        Self {
            state_machine: StateMachine::new(),
            registry,
            context,
        }
    }
}
