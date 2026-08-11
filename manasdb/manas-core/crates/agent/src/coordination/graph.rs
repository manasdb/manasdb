use crate::ids::AgentId;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Default)]
pub struct DelegationGraph {
    nodes: HashSet<AgentId>,
    edges: HashMap<AgentId, Vec<AgentId>>,
}

impl DelegationGraph {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_delegation(&mut self, parent: AgentId, child: AgentId) {
        self.nodes.insert(parent);
        self.nodes.insert(child);
        self.edges.entry(parent).or_insert_with(Vec::new).push(child);
    }
    
    pub fn get_children(&self, parent: &AgentId) -> Vec<AgentId> {
        self.edges.get(parent).cloned().unwrap_or_default()
    }
}
