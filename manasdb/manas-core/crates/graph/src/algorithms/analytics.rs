use std::collections::HashSet;

use crate::identity::NodeId;
use crate::memory::adjacency::AdjacencyList;

pub fn degree(adj: &AdjacencyList, node_id: &NodeId) -> (usize, usize) {
    let in_degree = adj.incoming.get(node_id).map(|edges| edges.len()).unwrap_or(0);
    let out_degree = adj.outgoing.get(node_id).map(|edges| edges.len()).unwrap_or(0);
    (in_degree, out_degree)
}

pub fn degree_centrality(adj: &AdjacencyList) -> std::collections::HashMap<NodeId, f64> {
    let mut centrality = std::collections::HashMap::new();
    let node_count = adj.nodes.len();
    
    if node_count <= 1 {
        for node_id in adj.nodes.keys() {
            centrality.insert(node_id.clone(), 0.0);
        }
        return centrality;
    }

    let max_possible_edges = (node_count - 1) as f64;

    for node_id in adj.nodes.keys() {
        let (in_deg, out_deg) = degree(adj, node_id);
        let total_degree = in_deg + out_deg;
        centrality.insert(node_id.clone(), total_degree as f64 / max_possible_edges);
    }

    centrality
}

pub fn connected_components(adj: &AdjacencyList) -> Vec<HashSet<NodeId>> {
    let mut components = Vec::new();
    let mut visited = HashSet::new();

    for node_id in adj.nodes.keys() {
        if !visited.contains(node_id) {
            let mut component = HashSet::new();
            let mut queue = std::collections::VecDeque::new();

            queue.push_back(node_id.clone());
            visited.insert(node_id.clone());
            component.insert(node_id.clone());

            while let Some(current) = queue.pop_front() {
                // Outgoing neighbors
                if let Some(edges) = adj.outgoing.get(&current) {
                    for edge_id in edges {
                        if let Some(edge) = adj.edges.get(edge_id) {
                            let next = &edge.target;
                            if !visited.contains(next) {
                                visited.insert(next.clone());
                                component.insert(next.clone());
                                queue.push_back(next.clone());
                            }
                        }
                    }
                }
                
                // Incoming neighbors (treat edges as undirected for connected components)
                if let Some(edges) = adj.incoming.get(&current) {
                    for edge_id in edges {
                        if let Some(edge) = adj.edges.get(edge_id) {
                            let prev = &edge.source;
                            if !visited.contains(prev) {
                                visited.insert(prev.clone());
                                component.insert(prev.clone());
                                queue.push_back(prev.clone());
                            }
                        }
                    }
                }
            }
            components.push(component);
        }
    }

    components
}
