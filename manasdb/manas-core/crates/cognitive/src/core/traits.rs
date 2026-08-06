use serde::{Serialize, Deserialize};
use async_trait::async_trait;
use super::metadata::EngineMetadata;
use super::context::EngineContext;
use super::errors::{CognitiveError, Warning};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CapabilityId {
    Observe,
    Interpret,
    Reasoning,
    Belief,
    Decision,
    Planning,
    Reflection,
    Learning,
    MemoryEvolution,
}

pub trait EngineResult {
    fn confidence(&self) -> Option<f32>;
    fn metadata(&self) -> &EngineMetadata;
    fn warnings(&self) -> &[Warning];
}

#[async_trait]
pub trait CognitiveEngine: Send + Sync {
    type Input;
    type Output: EngineResult;
    
    fn capability(&self) -> CapabilityId;
    
    async fn execute(
        &self, 
        input: Self::Input, 
        ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError>;
}
