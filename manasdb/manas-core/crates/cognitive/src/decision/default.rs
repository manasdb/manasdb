use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use super::engine::{DecisionEngine, DecisionResult};
use crate::belief::models::Belief;
use crate::decision::models::Decision;
use super::errors::DecisionError;

pub struct DefaultDecisionEngine;

impl DefaultDecisionEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultDecisionEngine {
    type Input = Vec<Belief>;
    type Output = DecisionResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Decision
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        if input.is_empty() {
            return Err(DecisionError::EvaluationError("No beliefs provided to make a decision".into()).into());
        }

        let decision = Decision::new("DoNothing", 1, "Deterministic fallback");
        
        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(DecisionResult {
            decision,
            alternatives: vec![],
            rejected: vec![],
            confidence: 1.0,
            reason: "Default deterministic evaluation".into(),
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl DecisionEngine for DefaultDecisionEngine {}
