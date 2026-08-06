#[derive(Debug, Clone, PartialEq, Eq)]
pub enum OrchestratorState {
    Idle,
    ExecutingWorkflow,
}

pub struct CognitiveStateMachine {
    current: OrchestratorState,
}

impl CognitiveStateMachine {
    pub fn new() -> Self {
        Self {
            current: OrchestratorState::Idle,
        }
    }
    
    pub fn transition(&mut self, state: OrchestratorState) {
        self.current = state;
    }
    
    pub fn current(&self) -> &OrchestratorState {
        &self.current
    }
}
