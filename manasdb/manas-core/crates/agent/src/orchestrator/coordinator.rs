use crate::orchestrator::context::OrchestrationContext;
use crate::orchestrator::mission::MissionManager;
use crate::orchestrator::services::SchedulerService;
use crate::orchestrator::execution_loop::ExecutionLoop;
use crate::orchestrator::events::{AgentEvent, EventBus, Publisher};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct ExecutionCoordinator {
    mission_manager: Arc<MissionManager>,
    scheduler: Arc<Mutex<dyn SchedulerService>>,
    execution_loop: Arc<ExecutionLoop>,
    event_bus: Arc<EventBus>,
}

impl ExecutionCoordinator {
    pub fn new(
        mission_manager: Arc<MissionManager>,
        scheduler: Arc<Mutex<dyn SchedulerService>>,
        execution_loop: Arc<ExecutionLoop>,
        event_bus: Arc<EventBus>,
    ) -> Self {
        Self {
            mission_manager,
            scheduler,
            execution_loop,
            event_bus,
        }
    }

    pub async fn run_mission(&self, context: &mut OrchestrationContext) -> Result<(), String> {
        self.event_bus.publish(AgentEvent::MissionStarted(context.mission.id), context.mission.id.to_string());
        
        self.execution_loop.run(context, self.scheduler.clone()).await?;

        // Basic check on completion policy
        let total = 0; // Stub
        let failed = 0; // Stub
        if !self.mission_manager.should_continue(failed, total) {
            self.event_bus.publish(AgentEvent::MissionFailed(context.mission.id, "Completion Policy Failed".to_string()), context.mission.id.to_string());
        } else {
            self.event_bus.publish(AgentEvent::MissionCompleted(context.mission.id), context.mission.id.to_string());
        }
        
        Ok(())
    }
}
