use std::collections::HashMap;

use crate::domain::{GraphEdge, GraphNode};
use crate::identity::{EdgeId, NodeId};
use crate::memory::snapshot::{GraphSnapshot, GraphVersion};
use crate::persistence::delta::GraphDelta;

/// A mutable builder to safely stage operations before committing them to a new snapshot.
pub struct GraphBuilder {
    base_snapshot: GraphSnapshot,
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

        Self {
            base_snapshot: snapshot.clone(),
            nodes,
            edges,
        }
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

    /// Commit the staged changes, returning a brand new immutable GraphSnapshot and the GraphDelta
    pub fn commit(self) -> (GraphSnapshot, GraphDelta) {
        let version_from = self.base_snapshot.version.clone();
        let version_to = GraphVersion(version_from.0 + 1);
        
        let mut delta = GraphDelta::new(version_from, version_to.clone());

        // Find deleted and updated nodes
        for base_node in &self.base_snapshot.nodes {
            if let Some(new_node) = self.nodes.get(&base_node.id) {
                if new_node != base_node {
                    delta.updated_nodes.push(new_node.clone());
                }
            } else {
                delta.deleted_nodes.push(base_node.clone());
            }
        }
        
        // Find inserted nodes
        let base_node_ids: std::collections::HashSet<_> = self.base_snapshot.nodes.iter().map(|n| n.id.clone()).collect();
        for new_node in self.nodes.values() {
            if !base_node_ids.contains(&new_node.id) {
                delta.inserted_nodes.push(new_node.clone());
            }
        }

        // Find deleted and updated edges
        for base_edge in &self.base_snapshot.edges {
            if let Some(new_edge) = self.edges.get(&base_edge.id) {
                if new_edge != base_edge {
                    delta.updated_edges.push(new_edge.clone());
                }
            } else {
                delta.deleted_edges.push(base_edge.clone());
            }
        }
        
        // Find inserted edges
        let base_edge_ids: std::collections::HashSet<_> = self.base_snapshot.edges.iter().map(|e| e.id.clone()).collect();
        for new_edge in self.edges.values() {
            if !base_edge_ids.contains(&new_edge.id) {
                delta.inserted_edges.push(new_edge.clone());
            }
        }

        let new_snapshot = GraphSnapshot {
            version: version_to,
            nodes: self.nodes.into_values().collect(),
            edges: self.edges.into_values().collect(),
            timestamp: chrono::Utc::now(),
        };
        
        (new_snapshot, delta)
    }
}
