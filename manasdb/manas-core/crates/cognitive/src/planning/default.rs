use async_trait::async_trait;
use crate::core::{CapabilityId, CognitiveEngine, EngineContext, EngineMetadata, CognitiveError};
use super::engine::{PlanningEngine, PlanningInput, PlanningResult};
use crate::planning::models::{Plan, Action};

pub struct DefaultPlanningEngine;

impl DefaultPlanningEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl CognitiveEngine for DefaultPlanningEngine {
    type Input = PlanningInput;
    type Output = PlanningResult;

    fn capability(&self) -> CapabilityId {
        CapabilityId::Planning
    }

    async fn execute(
        &self, 
        input: Self::Input, 
        _ctx: &EngineContext
    ) -> Result<Self::Output, CognitiveError> {
        let action = Action {
            id: uuid::Uuid::new_v4(),
            name: "ExecuteFallback".to_string(),
            parameters: std::collections::HashMap::new(),
        };

        let plan = Plan {
            id: uuid::Uuid::new_v4(),
            goal_id: input.goal.id,
            actions: vec![action],
        };

        let metadata = EngineMetadata::new(
            self.capability(),
            0,
            "default",
        );

        Ok(PlanningResult {
            plan,
            estimated_cost: None,
            estimated_duration_ms: None,
            risks: vec![],
            dependencies: vec![],
            metadata,
            warnings: vec![],
        })
    }
}

#[async_trait]
impl PlanningEngine for DefaultPlanningEngine {}
