use crate::orchestrator::coordinator::ExecutionCoordinator;
use crate::orchestrator::context::OrchestrationContext;
use crate::orchestrator::mission::ExecutionResult;
use std::sync::Arc;

pub struct RuntimeValidator {}

impl RuntimeValidator {
    pub fn validate(_coordinator: &ExecutionCoordinator) -> Result<(), String> {
        // Simple pre-flight checks could go here. 
        // e.g. checking that event_bus has subscribers, policies are valid, etc.
        Ok(())
    }
}

pub struct AgentRuntime {
    coordinator: Arc<ExecutionCoordinator>,
}

impl AgentRuntime {
    pub fn new(coordinator: Arc<ExecutionCoordinator>) -> Self {
        Self { coordinator }
    }

    pub async fn execute_mission(&self, mut context: OrchestrationContext) -> Result<ExecutionResult, String> {
        RuntimeValidator::validate(&self.coordinator)?;
        
        self.coordinator.run_mission(&mut context).await?;
        
        // Return a default successful ExecutionResult for this phase
        Ok(ExecutionResult::default())
    }
}
