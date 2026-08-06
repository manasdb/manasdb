use crate::core::types::Stimulus;
use crate::salience::models::SalienceLevel;
use async_trait::async_trait;

#[async_trait]
pub trait SalienceEngine: Send + Sync {
    async fn score(&self, stimulus: &Stimulus) -> f32;
    async fn classify(&self, stimulus: &Stimulus) -> SalienceLevel;
}

pub struct DefaultSalienceEngine;

#[async_trait]
impl SalienceEngine for DefaultSalienceEngine {
    async fn score(&self, _stimulus: &Stimulus) -> f32 {
        0.5 // Stub
    }
    
    async fn classify(&self, _stimulus: &Stimulus) -> SalienceLevel {
        SalienceLevel::Medium // Stub default
    }
}
