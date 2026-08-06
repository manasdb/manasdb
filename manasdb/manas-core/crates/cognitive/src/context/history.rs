use crate::core::types::{Stimulus, CognitiveResult};
use crate::governance::decision::GovernanceDecision;
use crate::reflection::ReflectionResult;
use crate::learning::LearningResult;

#[derive(Debug, Clone)]
pub enum HistoryEvent {
    StimulusReceived(Stimulus),
    WorkflowStarted(String),
    WorkflowCompleted(CognitiveResult),
    GovernanceDecision(GovernanceDecision),
    ReflectionGenerated(ReflectionResult),
    LearningGenerated(LearningResult),
}

#[derive(Debug, Clone, Default)]
pub struct SessionHistory {
    pub events: Vec<HistoryEvent>,
}

impl SessionHistory {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record(&mut self, event: HistoryEvent) {
        self.events.push(event);
    }
}
