use crate::orchestrator::context::OrchestrationContext;
use crate::orchestrator::events::{AgentEvent, EventBus, Publisher};
use crate::orchestrator::dispatcher::TaskDispatcher;
use crate::orchestrator::services::SchedulerService;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExecutionState {
    Created,
    Initialized,
    Planning,
    Scheduling,
    Executing,
    Observing,
    Reflecting,
    Recovering,
    Completed,
}

pub struct ExecutionLoop {
    dispatcher: Arc<TaskDispatcher>,
    event_bus: Arc<EventBus>,
}

impl ExecutionLoop {
    pub fn new(dispatcher: Arc<TaskDispatcher>, event_bus: Arc<EventBus>) -> Self {
        Self { dispatcher, event_bus }
    }

    pub async fn run(
        &self,
        context: &mut OrchestrationContext,
        scheduler: Arc<Mutex<dyn SchedulerService>>
    ) -> Result<(), String> {
        let mut _state = ExecutionState::Initialized;
        
        let mut sched = scheduler.lock().await;
        if let Some(graph) = &mut context.task_graph {
            while let Some(task_id) = sched.next_task(graph).await {
                // Publish task started
                self.event_bus.publish(AgentEvent::TaskStarted(task_id), context.mission.id.to_string());
                
                // Simulate task execution through dispatcher (using a dummy task for now)
                if let Some(task) = graph.nodes.get(&task_id).map(|n| n.task.clone()) {
                    let assignment = crate::coordination::assignment::TaskAssignment::new(task);
                    let mut dummy_context = crate::coordination::context::CoordinationContext::new();
                    let _res = self.dispatcher.dispatch(&assignment, &mut dummy_context).await;
                    
                    // Simulate task finished
                    self.event_bus.publish(AgentEvent::TaskFinished(task_id, "Success".to_string()), context.mission.id.to_string());
                    
                    sched.complete_task(task_id, graph).await?;
                }
            }
        }
        
        _state = ExecutionState::Completed;
        Ok(())
    }
}
