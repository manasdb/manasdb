use crate::coordination::assignment::TaskAssignment;
use crate::orchestrator::mission::ExecutionResult;
use async_trait::async_trait;

#[async_trait]
pub trait DelegationService: Send + Sync {
    async fn delegate(&self, assignment: &TaskAssignment) -> Result<ExecutionResult, String>;
}

pub struct DefaultDelegationService {}

impl DefaultDelegationService {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl DelegationService for DefaultDelegationService {
    async fn delegate(&self, _assignment: &TaskAssignment) -> Result<ExecutionResult, String> {
        Ok(ExecutionResult::default())
    }
}
