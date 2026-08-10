use crate::identity::{EdgeId, NodeId};
use crate::memory::adjacency::AdjacencyList;
use crate::memory::snapshot::GraphSnapshot;

pub fn neighbors(adj: &AdjacencyList, node_id: &NodeId) -> Vec<NodeId> {
    let mut result = Vec::new();
    if let Some(edges) = adj.outgoing.get(node_id) {
        for edge_id in edges {
            if let Some(edge) = adj.edges.get(edge_id) {
                result.push(edge.target.clone());
            }
        }
    }
    if let Some(edges) = adj.incoming.get(node_id) {
        for edge_id in edges {
            if let Some(edge) = adj.edges.get(edge_id) {
                result.push(edge.source.clone());
            }
        }
    }
    result.sort();
    result.dedup();
    result
}

pub fn incoming(adj: &AdjacencyList, node_id: &NodeId) -> Vec<EdgeId> {
    adj.incoming.get(node_id).cloned().unwrap_or_default()
}

pub fn outgoing(adj: &AdjacencyList, node_id: &NodeId) -> Vec<EdgeId> {
    adj.outgoing.get(node_id).cloned().unwrap_or_default()
}

pub fn subgraph(snapshot: &GraphSnapshot, node_ids: &[NodeId]) -> GraphSnapshot {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    let node_set: std::collections::HashSet<_> = node_ids.iter().cloned().collect();

    for node in &snapshot.nodes {
        if node_set.contains(&node.id) {
            nodes.push(node.clone());
        }
    }

    for edge in &snapshot.edges {
        if node_set.contains(&edge.source) && node_set.contains(&edge.target) {
            edges.push(edge.clone());
        }
    }

    GraphSnapshot {
        version: crate::memory::snapshot::GraphVersion(1),
        nodes,
        edges,
        timestamp: chrono::Utc::now(),
    }
}
