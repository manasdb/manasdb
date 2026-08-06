use crate::workflow::Workflow;
use crate::registry::CapabilityRegistry;
use crate::core::types::{Stimulus, CognitiveResult};
use crate::orchestrator::state_machine::{CognitiveStateMachine, OrchestratorState};
use crate::orchestrator::executor::WorkflowExecutor;
use std::sync::Arc;

pub struct CognitiveOrchestrator {
    pub state_machine: CognitiveStateMachine,
    pub registry: Arc<CapabilityRegistry>,
}

impl CognitiveOrchestrator {
    pub fn new(registry: Arc<CapabilityRegistry>) -> Self {
        Self {
            state_machine: CognitiveStateMachine::new(),
            registry,
        }
    }
    
    pub async fn process_stimulus(&mut self, stimulus: Stimulus, workflow: Workflow) -> Result<CognitiveResult, String> {
        self.state_machine.transition(OrchestratorState::ExecutingWorkflow);
        
        let executor = WorkflowExecutor::new(self.registry.clone());
        let result = executor.execute(stimulus, workflow).await;
        
        self.state_machine.transition(OrchestratorState::Idle);
        
        result
    }
}
