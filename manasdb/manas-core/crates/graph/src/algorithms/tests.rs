use crate::domain::{GraphEdge, GraphNode};
use crate::identity::NodeId;
use crate::types::{NodeKind, RelationshipKind};
use crate::memory::snapshot::GraphSnapshot;

use super::traversal::{neighbors, subgraph};
use super::pathfinding::{shortest_path, reachable};
use super::analytics::{degree, degree_centrality, connected_components};
use super::integrity::{cycle_detection, orphan_detection, duplicate_detection};

fn generate_random_snapshot(num_nodes: usize, num_edges: usize) -> GraphSnapshot {
    let mut nodes = Vec::with_capacity(num_nodes);
    for _ in 0..num_nodes {
        nodes.push(GraphNode::new(NodeKind::Concept));
    }
    
    let mut edges = Vec::with_capacity(num_edges);
    for i in 0..num_edges {
        let source_idx = i % num_nodes;
        let target_idx = (i + 1) % num_nodes;
        edges.push(GraphEdge::new(nodes[source_idx].id, nodes[target_idx].id, RelationshipKind::References));
    }
    
    GraphSnapshot {
        nodes,
        edges,
        timestamp: chrono::Utc::now(),
    }
}

#[test]
fn test_property_shortest_path_valid() {
    let snapshot = generate_random_snapshot(10, 10);
    let adj = snapshot.to_adjacency_list();
    
    let start = snapshot.nodes[0].id;
    let end = snapshot.nodes[5].id;
    
    let path = shortest_path(&adj, &start, &end).unwrap();
    assert_eq!(path.len(), 5);
}

#[test]
fn test_property_reachable_superset_of_neighbors() {
    let snapshot = generate_random_snapshot(20, 20);
    let adj = snapshot.to_adjacency_list();
    let start = snapshot.nodes[0].id;
    
    let n = neighbors(&adj, &start);
    let r = reachable(&adj, &start);
    
    for neighbor in n {
        assert!(r.contains(&neighbor));
    }
}

#[test]
fn test_cycle_detection() {
    let snapshot = generate_random_snapshot(5, 5); // Ring graph has a cycle
    let adj = snapshot.to_adjacency_list();
    assert!(cycle_detection(&adj));
}

#[test]
fn benchmark_traversal_complexity() {
    // Basic scaling test to verify it doesn't blow up
    let scales = vec![1_000, 10_000, 100_000]; // Note: skipped 1M to keep standard cargo test fast
    for &scale in &scales {
        let snapshot = generate_random_snapshot(scale, scale * 2);
        let adj = snapshot.to_adjacency_list();
        let start = snapshot.nodes[0].id;
        
        let start_time = std::time::Instant::now();
        let _r = reachable(&adj, &start);
        let elapsed = start_time.elapsed();
        
        assert!(elapsed.as_millis() < 500, "Traversal is taking too long");
    }
}
