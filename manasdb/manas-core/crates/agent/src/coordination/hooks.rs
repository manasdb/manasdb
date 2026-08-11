use crate::ids::AgentId;
use crate::coordination::assignment::TaskAssignment;

pub trait DelegationHook: Send + Sync {
    fn before_delegation(&self, assignment: &TaskAssignment);
    fn after_delegation(&self, assignment: &TaskAssignment);
    fn delegation_failed(&self, assignment: &TaskAssignment, reason: &str);
    fn agent_selected(&self, agent_id: &AgentId);
    fn agent_rejected(&self, agent_id: &AgentId, reason: &str);
}
