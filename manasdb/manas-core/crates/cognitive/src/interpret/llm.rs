use async_trait::async_trait;
use std::sync::Arc;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, CognitiveError};
use crate::interpret::engine::{InterpretationEngine, InterpretationResult};
use crate::llm::{LlmService, PromptBuilder, ResponseParser, JsonParser};
use crate::interpret::models::Fact;

pub struct LlmInterpretationEngine {
    llm_service: Arc<LlmService>,
}

impl LlmInterpretationEngine {
    pub fn new(llm_service: Arc<LlmService>) -> Self {
        Self { llm_service }
    }
}

#[async_trait]
impl CognitiveEngine for LlmInterpretationEngine {
    type Input = crate::observe::models::Observation;
    type Output = InterpretationResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Interpret
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        let stimulus = crate::core::types::Stimulus::Text(input.content.clone());
        let dummy_context = crate::context::WorkingContext::default();
        let messages = PromptBuilder::build_observation_prompt(&stimulus, &dummy_context); // We should use a specific prompt, reusing observation prompt for now
        
        let (response, metadata) = self.llm_service.execute_chat(self.capability(), messages)
            .await
            .map_err(|e| CognitiveError::ProviderError(e))?;
            
        let parser = JsonParser;
        let facts: Vec<Fact> = parser.parse(&response.content).unwrap_or_default();
            
        Ok(InterpretationResult {
            knowledge_facts: crate::knowledge::models::KnowledgeFacts { new_facts: facts },
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl InterpretationEngine for LlmInterpretationEngine {}
