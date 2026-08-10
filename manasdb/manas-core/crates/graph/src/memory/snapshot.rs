use serde::{Deserialize, Serialize};

use crate::domain::{GraphEdge, GraphNode};
use super::adjacency::AdjacencyList;
use super::index::GraphIndex;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub struct GraphVersion(pub u64);

impl Default for GraphVersion {
    fn default() -> Self {
        Self(0)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GraphSnapshot {
    pub version: GraphVersion,
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl GraphSnapshot {
    pub fn to_adjacency_list(&self) -> AdjacencyList {
        let mut adj = AdjacencyList::new();
        
        for node in &self.nodes {
            adj.nodes.insert(node.id.clone(), node.clone());
        }
        
        for edge in &self.edges {
            adj.edges.insert(edge.id.clone(), edge.clone());
            adj.outgoing.entry(edge.source.clone()).or_default().push(edge.id.clone());
            adj.incoming.entry(edge.target.clone()).or_default().push(edge.id.clone());
        }
        
        adj
    }

    pub fn to_graph_index(&self) -> GraphIndex {
        let mut idx = GraphIndex::new();
        
        for node in &self.nodes {
            idx.nodes_by_kind.entry(node.kind.clone()).or_default().push(node.id.clone());
            
            // Simple indexing of properties that are strings
            for (key, val) in &node.properties {
                if let crate::domain::GraphProperty::String(s) = val {
                    idx.nodes_by_property
                        .entry(key.clone())
                        .or_default()
                        .entry(s.clone())
                        .or_default()
                        .push(node.id.clone());
                }
            }
        }
        
        for edge in &self.edges {
            idx.edges_by_kind.entry(edge.kind.clone()).or_default().push(edge.id.clone());
        }
        
        idx
    }
}
