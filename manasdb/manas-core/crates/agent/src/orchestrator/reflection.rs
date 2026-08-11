use crate::orchestrator::gateway::CognitiveGateway;
use std::sync::Arc;

pub struct ReflectionCoordinator {
    gateway: Arc<CognitiveGateway>,
}

impl ReflectionCoordinator {
    pub fn new(gateway: Arc<CognitiveGateway>) -> Self {
        Self { gateway }
    }

    pub async fn reflect(&self, observation: &str) -> Result<String, String> {
        self.gateway.reflect(observation).await
    }
}
