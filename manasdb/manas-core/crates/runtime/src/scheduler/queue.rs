use crate::scheduler::task::Task;

pub struct TaskQueue {
    // In a real system, this would be a PriorityQueue or a set of channels
    // backed by a Tokio task spawn, but since we are agnostic, we might
    // just hold closures or abstract task execution.
    // For now, this is a placeholder.
    pub queue: Vec<Task>,
}

impl TaskQueue {
    pub fn new() -> Self {
        Self { queue: Vec::new() }
    }

    pub fn enqueue(&mut self, task: Task) {
        self.queue.push(task);
        // Sort by priority (highest first)
        self.queue.sort_by(|a, b| b.priority.cmp(&a.priority));
    }
}
