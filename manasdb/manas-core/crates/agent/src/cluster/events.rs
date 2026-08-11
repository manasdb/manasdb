use crate::ids::AgentId;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClusterEvent {
    PeerJoined(AgentId),
    PeerLeft(AgentId),
    NodeUnavailable(AgentId),
    TransportFailed(String),
    CheckpointSaved(String),
    ReplayStarted(String),
    ReplayCompleted(String),
}
