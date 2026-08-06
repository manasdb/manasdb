use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use crate::interpret::models::Fact;
use crate::reasoning::models::Hypothesis;
use super::engine::{ReasoningEngine, ReasoningResult};
use super::errors::ReasoningError;

pub struct DefaultReasoningEngine;

impl DefaultReasoningEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultReasoningEngine {
    type Input = Vec<Fact>;
    type Output = ReasoningResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Reasoning
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        if input.is_empty() {
            return Err(ReasoningError::EvaluationError("No facts provided for reasoning".into()).into());
        }

        let mut hypotheses = Vec::new();
        let mut source_facts = Vec::new();

        for fact in &input {
            source_facts.push(fact.id);
        }

        let hypothesis = Hypothesis::new(
            "Deterministic hypothesis based on facts".to_string(),
            1.0,
            source_facts,
        );
        hypotheses.push(hypothesis);

        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(ReasoningResult {
            facts: input.clone(),
            hypotheses,
            confidence: Some(1.0),
            evidence: vec![],
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl ReasoningEngine for DefaultReasoningEngine {}
