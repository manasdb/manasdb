use crate::planning::models::{Goal, Plan, TaskRequest};
use crate::belief::models::Belief;

#[derive(Debug, Clone, Default)]
pub struct WorkingContext {
    pub active_goal: Option<Goal>,
    pub active_task: Option<TaskRequest>,
    pub active_plan: Option<Plan>,
    pub current_beliefs: Vec<Belief>,
    pub execution_state: String,
}

impl WorkingContext {
    pub fn new() -> Self {
        Self::default()
    }
}
