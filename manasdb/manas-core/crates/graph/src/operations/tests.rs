use crate::domain::{GraphEdge, GraphNode};
use crate::identity::NodeId;
use crate::types::{NodeKind, RelationshipKind};
use crate::memory::snapshot::GraphSnapshot;

use super::builder::GraphBuilder;
use super::crud::GraphOperations;
use super::merge::{GraphMerge, MergeStrategy};

#[test]
fn test_immutable_builder() {
    let mut snapshot = GraphSnapshot {
        nodes: vec![],
        edges: vec![],
        timestamp: chrono::Utc::now(),
    };
    
    let original_node = GraphNode::new(NodeKind::Concept);
    snapshot.nodes.push(original_node.clone());
    
    // Create a builder and stage a mutation
    let mut builder = GraphBuilder::from_snapshot(&snapshot);
    let new_node = GraphNode::new(NodeKind::Person);
    builder.insert_node(new_node.clone());
    
    // Original snapshot should remain untouched
    assert_eq!(snapshot.nodes.len(), 1);
    assert_eq!(snapshot.nodes[0].id, original_node.id);
    
    // Commit to a new snapshot
    let next_snapshot = builder.commit();
    assert_eq!(next_snapshot.nodes.len(), 2);
}

#[test]
fn test_crud_operations() {
    let snapshot = GraphSnapshot { nodes: vec![], edges: vec![], timestamp: chrono::Utc::now() };
    let mut builder = GraphBuilder::from_snapshot(&snapshot);
    
    let node1 = GraphNode::new(NodeKind::Person);
    let node2 = GraphNode::new(NodeKind::Document);
    
    builder.insert_node(node1.clone());
    builder.insert_node(node2.clone());
    
    let edge = GraphEdge::new(node1.id.clone(), node2.id.clone(), RelationshipKind::Causes);
    builder.insert_edge(edge.clone()).unwrap();
    
    assert!(builder.delete_node(&node2.id));
    // Verify edge is also deleted because node2 was deleted
    let next_snapshot = builder.commit();
    assert_eq!(next_snapshot.nodes.len(), 1);
    assert_eq!(next_snapshot.edges.len(), 0);
}

#[test]
fn test_merge_semantics_by_business_key() {
    let snapshot = GraphSnapshot { nodes: vec![], edges: vec![], timestamp: chrono::Utc::now() };
    let mut builder = GraphBuilder::from_snapshot(&snapshot);
    
    let mut node1 = GraphNode::new(NodeKind::Person);
    node1.properties.insert("email".to_string(), crate::domain::GraphProperty::String("test@test.com".to_string()));
    node1.properties.insert("name".to_string(), crate::domain::GraphProperty::String("Alice".to_string()));
    
    // Merge first time (inserts)
    let id1 = builder.merge_node(node1.clone(), MergeStrategy::ByBusinessKey("email".to_string()));
    
    let mut node2 = GraphNode::new(NodeKind::Person);
    node2.properties.insert("email".to_string(), crate::domain::GraphProperty::String("test@test.com".to_string()));
    node2.properties.insert("name".to_string(), crate::domain::GraphProperty::String("Alice Updated".to_string()));
    
    // Merge second time (updates existing node due to same email)
    let id2 = builder.merge_node(node2.clone(), MergeStrategy::ByBusinessKey("email".to_string()));
    
    assert_eq!(id1, id2);
    
    let next_snapshot = builder.commit();
    assert_eq!(next_snapshot.nodes.len(), 1);
    
    let n = &next_snapshot.nodes[0];
    if let Some(crate::domain::GraphProperty::String(name)) = n.properties.get("name") {
        assert_eq!(name, "Alice Updated");
    } else {
        panic!("Missing property");
    }
}
