use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use crate::interpret::models::{Fact, Evidence};
use crate::observe::models::Observation;
use super::engine::{InterpretationEngine, InterpretationResult};
use super::errors::InterpretError;

pub struct DeterministicInterpretationEngine;

impl DeterministicInterpretationEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DeterministicInterpretationEngine {
    type Input = Observation;
    type Output = InterpretationResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Interpret
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        // Deterministic interpretation (no AI)
        if input.content.trim().is_empty() {
            return Err(InterpretError::ExtractionError("Cannot interpret empty observation".into()).into());
        }

        let evidence = Evidence {
            source_id: input.id.to_string(),
            confidence: 1.0, // Default deterministic confidence
        };
        
        let fact = Fact::new(format!("Extracted from: {}", input.content), vec![evidence]);
        
        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(InterpretationResult {
            knowledge_facts: crate::knowledge::models::KnowledgeFacts { new_facts: vec![fact] },
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl InterpretationEngine for DeterministicInterpretationEngine {}
