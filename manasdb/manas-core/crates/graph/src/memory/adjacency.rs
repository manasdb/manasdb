use std::collections::HashMap;

use crate::domain::{GraphEdge, GraphNode};
use crate::identity::{EdgeId, NodeId};

#[derive(Debug, Clone, Default)]
pub struct AdjacencyList {
    pub outgoing: HashMap<NodeId, Vec<EdgeId>>,
    pub incoming: HashMap<NodeId, Vec<EdgeId>>,
    pub nodes: HashMap<NodeId, GraphNode>,
    pub edges: HashMap<EdgeId, GraphEdge>,
}

impl AdjacencyList {
    pub fn new() -> Self {
        Self::default()
    }
}
