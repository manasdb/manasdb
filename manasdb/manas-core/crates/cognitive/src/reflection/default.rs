use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use super::engine::{ReflectionEngine, ReflectionResult};
use crate::reflection::models::Reflection;
use crate::belief::models::MemoryDelta;
use super::errors::ReflectionError;

pub struct DefaultReflectionEngine;

impl DefaultReflectionEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultReflectionEngine {
    type Input = Vec<MemoryDelta>;
    type Output = ReflectionResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Reflection
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        if input.is_empty() {
            return Err(ReflectionError::AnalysisError("No memory deltas provided for reflection".into()).into());
        }

        let reflection = Reflection::new(
            "Routine memory consolidation",
            "Analyzed recent memory changes.",
            input.iter().map(|d| d.belief_id).collect()
        );

        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(ReflectionResult {
            reflection,
            insights: vec![],
            weaknesses: vec![],
            optimization_suggestions: vec![],
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl ReflectionEngine for DefaultReflectionEngine {}
