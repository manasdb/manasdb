use crate::coordination::assignment::TaskAssignment;
use crate::coordination::runtime::{CoordinationRuntime, CoordinationResult};
use crate::coordination::context::CoordinationContext;
use std::sync::Arc;

pub struct TaskDispatcher {
    coordination_runtime: Arc<CoordinationRuntime>,
}

impl TaskDispatcher {
    pub fn new(coordination_runtime: Arc<CoordinationRuntime>) -> Self {
        Self { coordination_runtime }
    }

    pub async fn dispatch(
        &self, 
        assignment: &TaskAssignment, 
        context: &mut CoordinationContext
    ) -> Result<CoordinationResult, String> {
        self.coordination_runtime.coordinate(assignment, context).await
    }
}
