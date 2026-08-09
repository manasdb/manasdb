use super::domain::{GraphEdge, GraphNode};
use super::identity::NodeId;
use super::metadata::{Confidence, GraphMetadata, Source};
use super::schema::{
    CardinalityConstraint, GraphSchema, NodeDefinition, RelationshipDefinition, SchemaError,
    ValidationRule,
};
use super::types::{NodeKind, RelationshipKind};
use std::collections::HashMap;

#[test]
fn test_identity_uniqueness() {
    let id1 = NodeId::new();
    let id2 = NodeId::new();
    assert_ne!(id1, id2);
}

#[test]
fn test_temporal_and_provenance() {
    let mut meta = GraphMetadata::default();
    meta.source = Source::Document("doc_123".to_string());
    meta.confidence = Confidence::new(0.8);

    assert_eq!(meta.confidence.0, 0.8);
    assert_eq!(meta.source, Source::Document("doc_123".to_string()));
}

#[test]
fn test_serde_serialization() {
    let node = GraphNode::new(NodeKind::Person);
    let serialized = serde_json::to_string(&node).unwrap();
    let deserialized: GraphNode = serde_json::from_str(&serialized).unwrap();
    assert_eq!(node, deserialized);
}

#[test]
fn test_schema_validation_success() {
    let mut schema = GraphSchema::new();

    let person_def = NodeDefinition {
        kind: NodeKind::Person,
        properties: HashMap::new(),
    };
    schema.add_node_definition(person_def);

    let doc_def = NodeDefinition {
        kind: NodeKind::Document,
        properties: HashMap::new(),
    };
    schema.add_node_definition(doc_def);

    let auth_def = RelationshipDefinition {
        kind: RelationshipKind::Custom("AUTHORED".to_string()),
        properties: HashMap::new(),
        validation: ValidationRule {
            allowed_sources: vec![NodeKind::Person],
            allowed_targets: vec![NodeKind::Document],
        },
        cardinality: CardinalityConstraint::OneToMany,
    };
    schema.add_relationship_definition(auth_def);

    let person_node = GraphNode::new(NodeKind::Person);
    let doc_node = GraphNode::new(NodeKind::Document);
    let auth_edge = GraphEdge::new(
        person_node.id,
        doc_node.id,
        RelationshipKind::Custom("AUTHORED".to_string()),
    );

    assert!(schema.validate_node(&person_node).is_ok());
    assert!(schema.validate_node(&doc_node).is_ok());
    assert!(
        schema
            .validate_edge(&auth_edge, &person_node, &doc_node)
            .is_ok()
    );
}

#[test]
fn test_schema_validation_failure() {
    let mut schema = GraphSchema::new();

    let person_def = NodeDefinition {
        kind: NodeKind::Person,
        properties: HashMap::new(),
    };
    schema.add_node_definition(person_def);

    let doc_def = NodeDefinition {
        kind: NodeKind::Document,
        properties: HashMap::new(),
    };
    schema.add_node_definition(doc_def);

    let causes_def = RelationshipDefinition {
        kind: RelationshipKind::Causes,
        properties: HashMap::new(),
        validation: ValidationRule {
            allowed_sources: vec![NodeKind::Event],
            allowed_targets: vec![NodeKind::Event],
        },
        cardinality: CardinalityConstraint::ManyToMany,
    };
    schema.add_relationship_definition(causes_def);

    let person_node = GraphNode::new(NodeKind::Person);
    let doc_node = GraphNode::new(NodeKind::Document);

    // Person -> CAUSES -> Document should fail
    let bad_edge = GraphEdge::new(person_node.id, doc_node.id, RelationshipKind::Causes);

    let result = schema.validate_edge(&bad_edge, &person_node, &doc_node);
    assert!(matches!(
        result,
        Err(SchemaError::InvalidRelationship(_, _, _))
    ));
}
