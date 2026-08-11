use crate::coordination::session::AgentSession;
use crate::coordination::graph::DelegationGraph;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CoordinationContext {
    pub active_sessions: HashMap<String, AgentSession>,
    pub graph: DelegationGraph,
}

impl Default for CoordinationContext {
    fn default() -> Self {
        Self {
            active_sessions: HashMap::new(),
            graph: DelegationGraph::new(),
        }
    }
}

impl CoordinationContext {
    pub fn new() -> Self {
        Self::default()
    }
}
