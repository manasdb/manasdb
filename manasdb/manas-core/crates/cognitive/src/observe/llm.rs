use async_trait::async_trait;
use std::sync::Arc;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, CognitiveError};
use crate::observe::engine::{ObservationEngine, ObserveResult};
use crate::llm::{LlmService, PromptBuilder, ResponseParser, JsonParser};
use crate::observe::models::Observation;


pub struct LlmObservationEngine {
    llm_service: Arc<LlmService>,
}

impl LlmObservationEngine {
    pub fn new(llm_service: Arc<LlmService>) -> Self {
        Self { llm_service }
    }
}

#[async_trait]
impl CognitiveEngine for LlmObservationEngine {
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
        let stimulus = crate::core::types::Stimulus::Text(input);
        
        let dummy_context = crate::context::WorkingContext::default();
        let messages = PromptBuilder::build_observation_prompt(&stimulus, &dummy_context);
        
        let (response, metadata) = self.llm_service.execute_chat(self.capability(), messages)
            .await
            .map_err(|e| CognitiveError::ProviderError(e))?;
            
        let parser = JsonParser;
        let observation: Observation = parser.parse(&response.content)
            .map_err(|e| CognitiveError::ProviderError(format!("Parse error: {}", e)))?;
            
        Ok(ObserveResult {
            observation,
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl ObservationEngine for LlmObservationEngine {}
