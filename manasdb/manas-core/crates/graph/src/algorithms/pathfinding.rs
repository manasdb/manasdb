use std::collections::{HashSet, VecDeque};

use crate::identity::{EdgeId, NodeId};
use crate::memory::adjacency::AdjacencyList;

pub fn shortest_path(adj: &AdjacencyList, start: &NodeId, end: &NodeId) -> Option<Vec<EdgeId>> {
    if start == end {
        return Some(Vec::new());
    }

    let mut queue = VecDeque::new();
    let mut visited = HashSet::new();
    // Maps a visited node to (previous_node, edge_taken)
    let mut parent = std::collections::HashMap::new();

    queue.push_back(start.clone());
    visited.insert(start.clone());

    while let Some(current) = queue.pop_front() {
        if &current == end {
            break;
        }

        if let Some(edges) = adj.outgoing.get(&current) {
            for edge_id in edges {
                if let Some(edge) = adj.edges.get(edge_id) {
                    let next = &edge.target;
                    if !visited.contains(next) {
                        visited.insert(next.clone());
                        parent.insert(next.clone(), (current.clone(), edge_id.clone()));
                        queue.push_back(next.clone());
                    }
                }
            }
        }
    }

    if !parent.contains_key(end) {
        return None;
    }

    let mut path = Vec::new();
    let mut curr = end.clone();

    while &curr != start {
        let (prev, edge_id) = parent.get(&curr).unwrap().clone();
        path.push(edge_id);
        curr = prev;
    }

    path.reverse();
    Some(path)
}

pub fn all_paths(adj: &AdjacencyList, start: &NodeId, end: &NodeId, max_depth: usize) -> Vec<Vec<EdgeId>> {
    let mut results = Vec::new();
    let mut current_path = Vec::new();
    let mut visited = HashSet::new();
    
    fn dfs(
        adj: &AdjacencyList,
        current: &NodeId,
        end: &NodeId,
        max_depth: usize,
        visited: &mut HashSet<NodeId>,
        current_path: &mut Vec<EdgeId>,
        results: &mut Vec<Vec<EdgeId>>
    ) {
        if current == end {
            results.push(current_path.clone());
            return;
        }

        if current_path.len() >= max_depth {
            return;
        }

        if let Some(edges) = adj.outgoing.get(current) {
            for edge_id in edges {
                if let Some(edge) = adj.edges.get(edge_id) {
                    let next = &edge.target;
                    if !visited.contains(next) {
                        visited.insert(next.clone());
                        current_path.push(edge_id.clone());
                        dfs(adj, next, end, max_depth, visited, current_path, results);
                        current_path.pop();
                        visited.remove(next);
                    }
                }
            }
        }
    }

    visited.insert(start.clone());
    dfs(adj, start, end, max_depth, &mut visited, &mut current_path, &mut results);

    results
}

pub fn reachable(adj: &AdjacencyList, start: &NodeId) -> HashSet<NodeId> {
    let mut visited = HashSet::new();
    let mut queue = VecDeque::new();

    queue.push_back(start.clone());
    visited.insert(start.clone());

    while let Some(current) = queue.pop_front() {
        if let Some(edges) = adj.outgoing.get(&current) {
            for edge_id in edges {
                if let Some(edge) = adj.edges.get(edge_id) {
                    let next = &edge.target;
                    if !visited.contains(next) {
                        visited.insert(next.clone());
                        queue.push_back(next.clone());
                    }
                }
            }
        }
    }

    visited
}
