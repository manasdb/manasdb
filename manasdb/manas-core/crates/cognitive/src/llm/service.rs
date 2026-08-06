use std::sync::Arc;
use crate::llm::registry::ProviderRegistry;
use crate::llm::router::Router;
use crate::llm::retry::{RetryPolicy, with_retry};
use crate::llm::cache::PromptCache;
use crate::providers::{ChatRequest, ChatResponse, ChatMessage};
use crate::core::traits::CapabilityId;
use crate::core::metadata::EngineMetadata;

pub struct LlmService {
    registry: Arc<ProviderRegistry>,
    router: Arc<Router>,
    cache: Arc<dyn PromptCache>,
}

impl LlmService {
    pub fn new(registry: Arc<ProviderRegistry>, router: Arc<Router>, cache: Arc<dyn PromptCache>) -> Self {
        Self {
            registry,
            router,
            cache,
        }
    }
    
    pub async fn execute_chat(
        &self,
        capability: CapabilityId,
        messages: Vec<ChatMessage>
    ) -> Result<(ChatResponse, EngineMetadata), String> {
        let routes = self.router.get_routes(&capability)
            .ok_or_else(|| format!("No routes defined for capability: {:?}", capability))?;
            
        let mut last_error = "No routes available".to_string();
        
        for route in routes {
            if let Some(provider) = self.registry.get_chat(&route.provider) {
                let request = ChatRequest {
                    model: route.model.clone(),
                    system_prompt: None,
                    messages: messages.clone(), // Note: inefficient for now
                };
                
                // Check cache
                if let Some(cached_resp) = self.cache.get(&request).await {
                    let mut metadata = EngineMetadata::new(capability, 0, route.provider.0.clone());
                    metadata.model = Some(route.model.0.clone());
                    metadata.tokens_in = cached_resp.tokens_in;
                    metadata.tokens_out = cached_resp.tokens_out;
                    metadata.cached_tokens = cached_resp.cached_tokens;
                    metadata.reasoning_tokens = cached_resp.reasoning_tokens;
                    metadata.finish_reason = cached_resp.finish_reason.clone();
                    
                    return Ok((cached_resp, metadata));
                }
                
                let policy = RetryPolicy::default();
                
                let start_time = std::time::Instant::now();
                match with_retry(&policy, || {
                    let req = ChatRequest {
                        model: route.model.clone(),
                        system_prompt: None,
                        messages: messages.clone(),
                    };
                    provider.complete(req)
                }).await {
                    Ok(response) => {
                        let duration = start_time.elapsed().as_millis() as u64;
                        let mut metadata = EngineMetadata::new(capability, duration, route.provider.0.clone());
                        metadata.model = Some(route.model.0.clone());
                        metadata.tokens_in = response.tokens_in;
                        metadata.tokens_out = response.tokens_out;
                        metadata.cached_tokens = response.cached_tokens;
                        metadata.reasoning_tokens = response.reasoning_tokens;
                        metadata.finish_reason = response.finish_reason.clone();
                        
                        self.cache.set(&request, &response).await;
                        
                        return Ok((response, metadata));
                    },
                    Err(e) => {
                        last_error = e;
                        // Fall through to next route
                    }
                }
            }
        }
        
        Err(format!("All providers failed. Last error: {}", last_error))
    }
}
