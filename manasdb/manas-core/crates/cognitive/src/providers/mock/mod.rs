use async_trait::async_trait;
use crate::providers::traits::{
    ChatProvider, ChatRequest, ChatResponse, Lifecycle, ProviderCapabilities, ProviderId
};

pub struct MockProvider {
    id: ProviderId,
    should_fail: bool,
}

impl MockProvider {
    pub fn new(id_str: &str, should_fail: bool) -> Self {
        Self {
            id: ProviderId(id_str.to_string()),
            should_fail,
        }
    }
}

#[async_trait]
impl Lifecycle for MockProvider {
    async fn initialize(&self) -> Result<(), String> {
        Ok(())
    }
    
    async fn health_check(&self) -> Result<bool, String> {
        Ok(!self.should_fail)
    }
    
    async fn shutdown(&self) -> Result<(), String> {
        Ok(())
    }
}

#[async_trait]
impl ChatProvider for MockProvider {
    fn id(&self) -> ProviderId {
        self.id.clone()
    }
    
    fn capabilities(&self) -> ProviderCapabilities {
        ProviderCapabilities {
            chat: true,
            json_schema: true,
            vision: false,
            function_calling: false,
            streaming: false,
            embeddings: false,
        }
    }
    
    async fn complete(&self, request: ChatRequest) -> Result<ChatResponse, String> {
        if self.should_fail {
            return Err("MockProvider simulated failure".to_string());
        }
        
        let last_msg = request.messages.last().map(|m| m.content.clone()).unwrap_or_default();
        
        Ok(ChatResponse {
            content: format!("Mock response to: {}", last_msg),
            finish_reason: Some("stop".to_string()),
            tokens_in: Some(10),
            tokens_out: Some(15),
            cached_tokens: Some(0),
            reasoning_tokens: Some(0),
        })
    }
}
