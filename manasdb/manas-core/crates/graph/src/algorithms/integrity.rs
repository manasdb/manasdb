use std::collections::HashSet;

use crate::identity::{EdgeId, NodeId};
use crate::memory::adjacency::AdjacencyList;

pub fn cycle_detection(adj: &AdjacencyList) -> bool {
    let mut visited = HashSet::new();
    let mut recursion_stack = HashSet::new();

    for node_id in adj.nodes.keys() {
        if !visited.contains(node_id) {
            if dfs_cycle(adj, node_id, &mut visited, &mut recursion_stack) {
                return true;
            }
        }
    }

    false
}

fn dfs_cycle(
    adj: &AdjacencyList,
    current: &NodeId,
    visited: &mut HashSet<NodeId>,
    recursion_stack: &mut HashSet<NodeId>,
) -> bool {
    visited.insert(current.clone());
    recursion_stack.insert(current.clone());

    if let Some(edges) = adj.outgoing.get(current) {
        for edge_id in edges {
            if let Some(edge) = adj.edges.get(edge_id) {
                let next = &edge.target;
                
                if !visited.contains(next) {
                    if dfs_cycle(adj, next, visited, recursion_stack) {
                        return true;
                    }
                } else if recursion_stack.contains(next) {
                    return true;
                }
            }
        }
    }

    recursion_stack.remove(current);
    false
}

pub fn orphan_detection(adj: &AdjacencyList) -> Vec<NodeId> {
    let mut orphans = Vec::new();
    
    for node_id in adj.nodes.keys() {
        let in_deg = adj.incoming.get(node_id).map_or(0, |e| e.len());
        let out_deg = adj.outgoing.get(node_id).map_or(0, |e| e.len());
        
        if in_deg == 0 && out_deg == 0 {
            orphans.push(node_id.clone());
        }
    }
    
    orphans
}

pub fn duplicate_detection(adj: &AdjacencyList) -> Vec<EdgeId> {
    let mut duplicates = Vec::new();
    let mut seen_edges: HashSet<(NodeId, NodeId)> = HashSet::new();
    
    for edge in adj.edges.values() {
        let pair = (edge.source.clone(), edge.target.clone());
        if !seen_edges.insert(pair) {
            // Pair was already present, so this is a duplicate directionally
            duplicates.push(edge.id.clone());
        }
    }
    
    duplicates
}
