use crate::models::{mission::Mission, goal::Goal};
use crate::ids::TaskId;
use crate::planning::dag::TaskGraph;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct OrchestrationContext {
    pub mission: Mission,
    pub active_goal: Option<Goal>,
    pub active_task: Option<TaskId>,
    pub task_graph: Option<TaskGraph>,
    pub retry_counts: HashMap<TaskId, u32>,
    pub runtime_state: HashMap<String, String>,
}

impl OrchestrationContext {
    pub fn new(mission: Mission) -> Self {
        Self {
            mission,
            active_goal: None,
            active_task: None,
            task_graph: None,
            retry_counts: HashMap::new(),
            runtime_state: HashMap::new(),
        }
    }

    pub fn increment_retry(&mut self, task_id: TaskId) -> u32 {
        let count = self.retry_counts.entry(task_id).or_insert(0);
        *count += 1;
        *count
    }
}
