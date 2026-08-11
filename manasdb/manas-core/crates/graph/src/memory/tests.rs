use crate::domain::{GraphEdge, GraphNode};
use crate::types::{NodeKind, RelationshipKind};
use super::snapshot::GraphSnapshot;

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
        version: crate::memory::snapshot::GraphVersion::default(),
        nodes,
        edges,
        timestamp: chrono::Utc::now(),
    }
}

#[test]
fn test_graph_invariants() {
    let snapshot = generate_random_snapshot(100, 200);
    let adj = snapshot.to_adjacency_list();
    
    assert_eq!(adj.nodes.len(), snapshot.nodes.len());
    assert_eq!(adj.edges.len(), snapshot.edges.len());
    
    let index = snapshot.to_graph_index();
    assert_eq!(index.nodes_by_kind.get(&NodeKind::Concept).unwrap().len(), 100);
}
