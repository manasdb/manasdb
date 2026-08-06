use crate::workflow::Workflow;
use crate::registry::CapabilityRegistry;
use crate::core::types::{Stimulus, CognitiveResult};
use crate::orchestrator::state_machine::{CognitiveStateMachine, OrchestratorState};
use crate::orchestrator::executor::WorkflowExecutor;
use crate::salience::{SalienceEngine, SalienceLevel};
use crate::context::WorkingMemory;
use std::sync::Arc;

pub struct CognitiveOrchestrator {
    pub state_machine: CognitiveStateMachine,
    pub registry: Arc<CapabilityRegistry>,
    pub salience_engine: Arc<dyn SalienceEngine>,
}

impl CognitiveOrchestrator {
    pub fn new(registry: Arc<CapabilityRegistry>, salience_engine: Arc<dyn SalienceEngine>) -> Self {
        Self {
            state_machine: CognitiveStateMachine::new(),
            registry,
            salience_engine,
        }
    }
    
    pub async fn process_stimulus(&mut self, stimulus: Stimulus, workflow: Workflow, memory: &mut WorkingMemory) -> Result<Option<CognitiveResult>, String> {
        self.state_machine.transition(OrchestratorState::ExecutingWorkflow);
        
        let salience = self.salience_engine.classify(&stimulus).await;
        if salience == SalienceLevel::Ignore || salience == SalienceLevel::Low {
            self.state_machine.transition(OrchestratorState::Idle);
            return Ok(None);
        }
        
        let executor = WorkflowExecutor::new(self.registry.clone());
        let result = executor.execute(stimulus, workflow, memory).await?;
        
        self.state_machine.transition(OrchestratorState::Idle);
        
        Ok(Some(result))
    }
}
