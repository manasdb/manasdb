use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use super::engine::{BeliefEngine, BeliefInput, BeliefUpdate};
use crate::belief::models::Belief;

pub struct DefaultBeliefEngine;

impl DefaultBeliefEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultBeliefEngine {
    type Input = BeliefInput;
    type Output = BeliefUpdate;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Belief
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        let mut created = Vec::new();

        if !input.hypotheses.is_empty() {
            created.push(Belief::new(
                "Consolidated belief from hypothesis", 
                1.0
            ));
        }

        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(BeliefUpdate {
            created,
            updated: vec![],
            removed: vec![],
            conflicts: vec![],
            confidence_changes: vec![],
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl BeliefEngine for DefaultBeliefEngine {}
