use crate::orchestrator::context::OrchestrationContext;
use crate::coordination::session::AgentSession;
use crate::ids::MissionId;

pub trait StateStore: Send + Sync {
    fn save_context(&self, context: &OrchestrationContext) -> Result<(), String>;
    fn load_context(&self, mission_id: &MissionId) -> Result<OrchestrationContext, String>;
    fn save_session(&self, session: &AgentSession) -> Result<(), String>;
}
