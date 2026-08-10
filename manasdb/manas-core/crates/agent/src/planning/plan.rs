use crate::models::{Constraint, Task};
use crate::models::execution::ResourceBudget;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExecutionPlan {
    pub tasks: Vec<Task>,
    pub constraints: Vec<Constraint>,
    pub resources: ResourceBudget,
    pub ordering: Vec<(crate::ids::TaskId, crate::ids::TaskId)>, // from -> to
}

impl Default for ExecutionPlan {
    fn default() -> Self {
        Self {
            tasks: Vec::new(),
            constraints: Vec::new(),
            resources: ResourceBudget::default(),
            ordering: Vec::new(),
        }
    }
}
