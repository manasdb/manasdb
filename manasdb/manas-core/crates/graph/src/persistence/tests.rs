use crate::domain::GraphNode;
use crate::types::NodeKind;
use super::repository::GraphRepository;
use super::loader::{SnapshotLoader, HydrationStrategy};
use super::memory::InMemoryBackend;
use crate::operations::builder::GraphBuilder;
use crate::operations::crud::GraphOperations;

#[test]
fn test_memory_backend_crud() {
    let backend = InMemoryBackend::new();
    
    // Initial snapshot should be empty
    let initial_snapshot = backend.load_snapshot(HydrationStrategy::Full).unwrap();
    assert_eq!(initial_snapshot.nodes.len(), 0);
    assert_eq!(initial_snapshot.version.0, 1);
    
    // Create delta using builder
    let mut builder = GraphBuilder::from_snapshot(&initial_snapshot);
    let mut node = GraphNode::new(NodeKind::Person);
    node.properties.insert("name".to_string(), crate::domain::GraphProperty::String("Alice".to_string()));
    
    builder.insert_node(node.clone());
    let (_, delta) = builder.commit();
    
    assert_eq!(delta.inserted_nodes.len(), 1);
    assert_eq!(delta.version_from.0, 1);
    assert_eq!(delta.version_to.0, 2);
    
    // Apply transaction
    let mut tx = backend.begin_transaction().unwrap();
    tx.apply(delta).unwrap();
    tx.commit().unwrap();
    
    // Load new snapshot
    let new_snapshot = backend.load_snapshot(HydrationStrategy::Full).unwrap();
    assert_eq!(new_snapshot.nodes.len(), 1);
    assert_eq!(new_snapshot.version.0, 2);
}

#[test]
fn test_concurrent_delta_validation() {
    let backend = InMemoryBackend::new();
    let initial_snapshot = backend.load_snapshot(HydrationStrategy::Full).unwrap();
    
    // Builder A
    let mut builder_a = GraphBuilder::from_snapshot(&initial_snapshot);
    builder_a.insert_node(GraphNode::new(NodeKind::Person));
    let (_, delta_a) = builder_a.commit();
    
    // Builder B (concurrent from same snapshot)
    let mut builder_b = GraphBuilder::from_snapshot(&initial_snapshot);
    builder_b.insert_node(GraphNode::new(NodeKind::Document));
    let (_, delta_b) = builder_b.commit();
    
    // Transaction A commits successfully
    let mut tx_a = backend.begin_transaction().unwrap();
    tx_a.apply(delta_a).unwrap();
    tx_a.commit().unwrap();
    
    // Transaction B should fail optimistic concurrency control
    let mut tx_b = backend.begin_transaction().unwrap();
    let result = tx_b.apply(delta_b);
    assert!(result.is_err(), "Concurrent transaction from old version should fail");
    assert!(result.unwrap_err().contains("Optimistic Concurrency Control Failed"));
}
