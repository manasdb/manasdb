use crate::ids::{AgentId, MissionId};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CoordinationEvent {
    AgentDelegated(AgentId, MissionId),
    AgentAccepted(AgentId, MissionId),
    AgentRejected(AgentId, MissionId, String),
    MissionDelegated(MissionId),
    MissionCompleted(MissionId),
    AgentUnavailable(String),
    RoutingFailed(String),
}
