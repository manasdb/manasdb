use crate::models::{AgentContext, Goal};
use crate::planning::plan::ExecutionPlan;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PlanError {
    #[error("Goal constraints cannot be satisfied")]
    UnsatisfiableConstraints,
    #[error("Internal planner error: {0}")]
    InternalError(String),
}

pub trait TaskPlanner {
    fn plan_goal(
        &self,
        goal: &Goal,
        context: &AgentContext,
    ) -> Result<ExecutionPlan, PlanError>;
}
