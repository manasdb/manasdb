use crate::ids::AgentId;
use crate::orchestrator::mission::ExecutionResult;
use crate::coordination::context::CoordinationContext;
use crate::coordination::validator::CoordinationValidator;
use crate::coordination::service::DelegationService;
use crate::coordination::assignment::TaskAssignment;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct CoordinationResult {
    pub is_local: bool,
    pub is_delegated: bool,
    pub agent_id: AgentId,
    pub execution_result: ExecutionResult,
    pub routing_trace: Vec<String>,
}

pub struct CoordinationRuntime {
    delegation_service: Arc<dyn DelegationService>,
    // In full impl, this owns the Manager, Routing, Propagation, etc.
}

impl CoordinationRuntime {
    pub fn new(delegation_service: Arc<dyn DelegationService>) -> Self {
        Self { delegation_service }
    }

    pub async fn coordinate(&self, assignment: &TaskAssignment, _context: &mut CoordinationContext) -> Result<CoordinationResult, String> {
        CoordinationValidator::validate()?;
        
        let execution_result = self.delegation_service.delegate(assignment).await?;
        
        Ok(CoordinationResult {
            is_local: false, // Stub
            is_delegated: true, // Stub
            agent_id: AgentId::new(),
            execution_result,
            routing_trace: vec!["Delegated to child".to_string()],
        })
    }
}
