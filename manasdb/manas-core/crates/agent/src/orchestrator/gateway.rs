use crate::orchestrator::services::{CognitiveService, KnowledgeService, PlanningService};
use std::sync::Arc;

#[allow(dead_code)]
pub struct CognitiveGateway {
    cognitive_service: Arc<dyn CognitiveService>,
    knowledge_service: Arc<dyn KnowledgeService>,
    planning_service: Arc<dyn PlanningService>,
}

impl CognitiveGateway {
    pub fn new(
        cognitive_service: Arc<dyn CognitiveService>,
        knowledge_service: Arc<dyn KnowledgeService>,
        planning_service: Arc<dyn PlanningService>,
    ) -> Self {
        Self {
            cognitive_service,
            knowledge_service,
            planning_service,
        }
    }

    pub async fn observe(&self, input: &str) -> Result<String, String> {
        self.cognitive_service.observe(input).await
    }

    pub async fn reflect(&self, observation: &str) -> Result<String, String> {
        self.cognitive_service.reflect(observation).await
    }
}
