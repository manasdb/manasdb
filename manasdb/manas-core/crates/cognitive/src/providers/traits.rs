use async_trait::async_trait;
use crate::core::errors::CognitiveError;

#[async_trait]
pub trait ObserveProvider: Send + Sync {
    async fn observe(&self, input: &str) -> Result<String, CognitiveError>;
}

#[async_trait]
pub trait InterpretProvider: Send + Sync {
    async fn interpret(&self, observation: &str) -> Result<String, CognitiveError>;
}

#[async_trait]
pub trait ReasoningProvider: Send + Sync {
    async fn reason(&self, premise: &str) -> Result<String, CognitiveError>;
}

#[async_trait]
pub trait ReflectionProvider: Send + Sync {
    async fn reflect(&self, memory: &str) -> Result<String, CognitiveError>;
}

#[async_trait]
pub trait PlanningProvider: Send + Sync {
    async fn plan(&self, goal: &str) -> Result<String, CognitiveError>;
}
