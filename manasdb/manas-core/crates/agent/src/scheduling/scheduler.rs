use crate::ids::TaskId;
use crate::planning::dag::TaskGraph;
use crate::scheduling::events::SchedulingEvents;
use crate::scheduling::queue::{FIFOQueue, TaskQueue, TaskReadiness};
use crate::scheduling::strategy::{FIFOSchedulingStrategy, SchedulingStrategy};

pub trait Scheduler {
    fn step(&mut self, graph: &mut TaskGraph) -> Vec<SchedulingEvents>;
    fn next_task(&mut self, graph: &TaskGraph) -> Option<TaskId>;
    fn complete_task(&mut self, id: TaskId, graph: &mut TaskGraph) -> Vec<SchedulingEvents>;
    fn fail_task(&mut self, id: TaskId, reason: String, graph: &mut TaskGraph) -> Vec<SchedulingEvents>;
}

pub struct DefaultScheduler {
    queue: Box<dyn TaskQueue>,
    #[allow(dead_code)]
    strategy: Box<dyn SchedulingStrategy>,
}

impl DefaultScheduler {
    pub fn new() -> Self {
        Self {
            queue: Box::new(FIFOQueue::new()),
            strategy: Box::new(FIFOSchedulingStrategy),
        }
    }

    pub fn with_strategy_and_queue(
        strategy: Box<dyn SchedulingStrategy>,
        queue: Box<dyn TaskQueue>,
    ) -> Self {
        Self { queue, strategy }
    }
}

impl Scheduler for DefaultScheduler {
    fn step(&mut self, graph: &mut TaskGraph) -> Vec<SchedulingEvents> {
        let mut events = Vec::new();
        let unblocked = graph.get_unblocked_tasks();

        for id in unblocked {
            if let Some(node) = graph.nodes.get_mut(&id) {
                if node.scheduling_metadata.readiness == TaskReadiness::WaitingDependency {
                    node.scheduling_metadata.readiness = TaskReadiness::Ready;
                    self.queue.push(id);
                    events.push(SchedulingEvents::TaskReady(id));
                }
            }
        }
        events
    }

    fn next_task(&mut self, _graph: &TaskGraph) -> Option<TaskId> {
        // Here we could dump queue to slice, pass to strategy, and remove selected.
        // For simplicity in DefaultScheduler, just pop.
        self.queue.pop()
    }

    fn complete_task(&mut self, id: TaskId, graph: &mut TaskGraph) -> Vec<SchedulingEvents> {
        let mut events = vec![SchedulingEvents::TaskCompleted(id)];
        graph.remove_task(id); // Completing a task removes it from DAG (or marks it completed so children unblock)
        // In a real DAG, instead of removing, we'd mark it completed and re-evaluate readiness of children.
        // Removing is a simplified way to unblock children (incoming edges drop to 0).
        events.extend(self.step(graph));
        events
    }

    fn fail_task(&mut self, id: TaskId, reason: String, _graph: &mut TaskGraph) -> Vec<SchedulingEvents> {
        // Block children? For now just fail.
        vec![SchedulingEvents::TaskFailed(id, reason)]
    }
}
