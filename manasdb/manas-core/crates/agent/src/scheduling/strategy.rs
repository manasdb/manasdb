use crate::ids::TaskId;
use crate::planning::dag::TaskGraph;

pub trait SchedulingStrategy {
    fn select_next_task(&self, ready_tasks: &[TaskId], graph: &TaskGraph) -> Option<TaskId>;
}

pub struct FIFOSchedulingStrategy;

impl SchedulingStrategy for FIFOSchedulingStrategy {
    fn select_next_task(&self, ready_tasks: &[TaskId], _graph: &TaskGraph) -> Option<TaskId> {
        ready_tasks.first().copied()
    }
}

pub struct PrioritySchedulingStrategy;

impl SchedulingStrategy for PrioritySchedulingStrategy {
    fn select_next_task(&self, ready_tasks: &[TaskId], graph: &TaskGraph) -> Option<TaskId> {
        ready_tasks
            .iter()
            .copied()
            .max_by_key(|id| {
                graph.nodes.get(id).map(|n| n.task.priority).unwrap_or_default()
            })
    }
}
