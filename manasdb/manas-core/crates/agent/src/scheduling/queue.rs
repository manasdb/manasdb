use crate::ids::TaskId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskReadiness {
    Ready,
    WaitingDependency,
    WaitingResources,
    WaitingPermission,
    Blocked,
    Skipped,
}

pub trait TaskQueue {
    fn push(&mut self, task_id: TaskId);
    fn pop(&mut self) -> Option<TaskId>;
    fn peek(&self) -> Option<&TaskId>;
    fn remove(&mut self, task_id: TaskId);
    fn len(&self) -> usize;
    fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

pub struct FIFOQueue {
    queue: std::collections::VecDeque<TaskId>,
}

impl FIFOQueue {
    pub fn new() -> Self {
        Self {
            queue: std::collections::VecDeque::new(),
        }
    }
}

impl TaskQueue for FIFOQueue {
    fn push(&mut self, task_id: TaskId) {
        self.queue.push_back(task_id);
    }

    fn pop(&mut self) -> Option<TaskId> {
        self.queue.pop_front()
    }

    fn peek(&self) -> Option<&TaskId> {
        self.queue.front()
    }

    fn remove(&mut self, task_id: TaskId) {
        self.queue.retain(|id| *id != task_id);
    }

    fn len(&self) -> usize {
        self.queue.len()
    }
}
