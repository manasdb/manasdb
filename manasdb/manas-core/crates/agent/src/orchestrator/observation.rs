use crate::orchestrator::gateway::CognitiveGateway;
use std::sync::Arc;

pub struct ObservationNormalizer {}

impl ObservationNormalizer {
    pub fn normalize(raw: &str) -> String {
        raw.to_string()
    }
}

pub struct ObservationPipeline {
    gateway: Arc<CognitiveGateway>,
}

impl ObservationPipeline {
    pub fn new(gateway: Arc<CognitiveGateway>) -> Self {
        Self { gateway }
    }

    pub async fn process_task_result(&self, raw_result: &str) -> Result<String, String> {
        let normalized = ObservationNormalizer::normalize(raw_result);
        self.gateway.observe(&normalized).await
    }
}
