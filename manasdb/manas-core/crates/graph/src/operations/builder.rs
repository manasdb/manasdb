use std::collections::HashMap;

use crate::domain::{GraphEdge, GraphNode};
use crate::identity::{EdgeId, NodeId};
use crate::memory::snapshot::GraphSnapshot;

/// A mutable builder to safely stage operations before committing them to a new snapshot.
pub struct GraphBuilder {
    nodes: HashMap<NodeId, GraphNode>,
    edges: HashMap<EdgeId, GraphEdge>,
}

impl GraphBuilder {
    /// Create a new builder starting from an existing snapshot
    pub fn from_snapshot(snapshot: &GraphSnapshot) -> Self {
        let mut nodes = HashMap::new();
        let mut edges = HashMap::new();

        for node in &snapshot.nodes {
            nodes.insert(node.id.clone(), node.clone());
        }

        for edge in &snapshot.edges {
            edges.insert(edge.id.clone(), edge.clone());
        }

        Self { nodes, edges }
    }

    /// Internal access to nodes mapping
    pub(crate) fn nodes_mut(&mut self) -> &mut HashMap<NodeId, GraphNode> {
        &mut self.nodes
    }

    pub(crate) fn nodes(&self) -> &HashMap<NodeId, GraphNode> {
        &self.nodes
    }

    /// Internal access to edges mapping
    pub(crate) fn edges_mut(&mut self) -> &mut HashMap<EdgeId, GraphEdge> {
        &mut self.edges
    }
    
    pub(crate) fn edges(&self) -> &HashMap<EdgeId, GraphEdge> {
        &self.edges
    }

    /// Commit the staged changes, returning a brand new immutable GraphSnapshot
    pub fn commit(self) -> GraphSnapshot {
        GraphSnapshot {
            nodes: self.nodes.into_values().collect(),
            edges: self.edges.into_values().collect(),
            timestamp: chrono::Utc::now(),
        }
    }
}
