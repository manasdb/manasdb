#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CognitiveState {
    Idle,
    Observing,
    Reasoning,
    Planning,
    Reflecting,
    Learning,
    Consolidating,
    Archiving,
    Evaluating,
    Recovering,
    // Allows future extension
    Custom(String),
}

impl Default for CognitiveState {
    fn default() -> Self {
        Self::Idle
    }
}

pub struct StateMachine {
    pub current_state: CognitiveState,
}

impl StateMachine {
    pub fn new() -> Self {
        Self {
            current_state: CognitiveState::Idle,
        }
    }

    pub fn transition_to(&mut self, new_state: CognitiveState) {
        self.current_state = new_state;
    }
}
