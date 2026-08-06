use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use crate::observe::models::{Observation, ObservationSource};
use super::engine::{ObservationEngine, ObserveResult};
use super::errors::ObserveError;

pub struct DefaultObservationEngine;

impl DefaultObservationEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultObservationEngine {
    type Input = String;
    type Output = ObserveResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Observe
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        // Deterministic processing (no AI)
        if input.trim().is_empty() {
            return Err(ObserveError::ParseError("Input is empty".into()).into());
        }

        let observation = Observation::new(ObservationSource::System, input);
        
        let metadata = EngineMetadata::new(
            self.capability(),
            0, // duration_ms
            "default", // provider
        );

        Ok(ObserveResult {
            observation,
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl ObservationEngine for DefaultObservationEngine {}
