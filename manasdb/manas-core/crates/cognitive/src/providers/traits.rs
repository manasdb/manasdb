use async_trait::async_trait;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ProviderCapabilities {
    pub chat: bool,
    pub json_schema: bool,
    pub vision: bool,
    pub function_calling: bool,
    pub streaming: bool,
    pub embeddings: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ProviderId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ModelId(pub String);

#[async_trait]
pub trait Lifecycle {
    async fn initialize(&self) -> Result<(), String>;
    async fn health_check(&self) -> Result<bool, String>;
    async fn shutdown(&self) -> Result<(), String>;
}

pub struct ChatRequest {
    pub model: ModelId,
    pub system_prompt: Option<String>,
    pub messages: Vec<ChatMessage>,
}

#[derive(Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

pub struct ChatResponse {
    pub content: String,
    pub finish_reason: Option<String>,
    pub tokens_in: Option<u32>,
    pub tokens_out: Option<u32>,
    pub cached_tokens: Option<u32>,
    pub reasoning_tokens: Option<u32>,
}

#[async_trait]
pub trait ChatProvider: Lifecycle + Send + Sync {
    fn id(&self) -> ProviderId;
    fn capabilities(&self) -> ProviderCapabilities;
    
    async fn complete(&self, request: ChatRequest) -> Result<ChatResponse, String>;
}

// Stubs for future extension
#[async_trait]
pub trait EmbeddingProvider: Lifecycle + Send + Sync {
    async fn embed(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>, String>;
}

#[async_trait]
pub trait VisionProvider: Lifecycle + Send + Sync {}

#[async_trait]
pub trait StreamingProvider: Lifecycle + Send + Sync {}
