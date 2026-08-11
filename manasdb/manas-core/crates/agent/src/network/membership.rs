use crate::ids::AgentId;
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PeerHealth {
    Healthy,
    Degraded,
    Unreachable,
}

pub struct PeerRegistry {
    pub peers: HashMap<AgentId, PeerHealth>,
}

impl PeerRegistry {
    pub fn new() -> Self {
        Self {
            peers: HashMap::new(),
        }
    }

    pub fn register_peer(&mut self, peer_id: AgentId) {
        self.peers.insert(peer_id, PeerHealth::Healthy);
    }
    
    pub fn set_health(&mut self, peer_id: &AgentId, health: PeerHealth) {
        if let Some(h) = self.peers.get_mut(peer_id) {
            *h = health;
        }
    }
}
