use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use super::engine::{LearningEngine, LearningResult};
use crate::reflection::models::{Reflection, LearningEvent};

pub struct DefaultLearningEngine;

impl DefaultLearningEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultLearningEngine {
    type Input = Reflection;
    type Output = LearningResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Learning
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        let learning_event = LearningEvent {
            id: uuid::Uuid::new_v4(),
            key_takeaway: format!("Learned from reflection: {}", input.topic),
            adjusted_policy_id: None,
        };

        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(LearningResult {
            learning_events: vec![learning_event],
            belief_updates: vec![],
            policy_suggestions: vec![],
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl LearningEngine for DefaultLearningEngine {}
