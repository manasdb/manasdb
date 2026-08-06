use crate::providers::{ChatRequest, ChatResponse};
use async_trait::async_trait;

#[async_trait]
pub trait PromptCache: Send + Sync {
    async fn get(&self, request: &ChatRequest) -> Option<ChatResponse>;
    async fn set(&self, request: &ChatRequest, response: &ChatResponse);
}

// A stub pass-through cache
pub struct NoOpCache;

#[async_trait]
impl PromptCache for NoOpCache {
    async fn get(&self, _request: &ChatRequest) -> Option<ChatResponse> { None }
    async fn set(&self, _request: &ChatRequest, _response: &ChatResponse) {}
}
