use std::collections::HashMap;
use thiserror::Error;

use crate::domain::{GraphEdge, GraphNode};
use crate::types::{NodeKind, RelationshipKind};

#[derive(Debug, Error, PartialEq)]
pub enum SchemaError {
    #[error("Node kind {0:?} is not defined in the schema")]
    UnknownNodeKind(NodeKind),
    #[error("Relationship kind {0:?} is not defined in the schema")]
    UnknownRelationshipKind(RelationshipKind),
    #[error("Relationship {0:?} from {1:?} to {2:?} violates schema")]
    InvalidRelationship(RelationshipKind, NodeKind, NodeKind),
    #[error("Property {0} is required but missing")]
    MissingRequiredProperty(String),
    #[error("Cardinality constraint violated: {0}")]
    CardinalityViolation(String),
}

#[derive(Debug, Clone, PartialEq)]
pub enum PropertyType {
    String,
    Int,
    Float,
    Bool,
    Json,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PropertyDefinition {
    pub name: String,
    pub ptype: PropertyType,
    pub required: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct NodeDefinition {
    pub kind: NodeKind,
    pub properties: HashMap<String, PropertyDefinition>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CardinalityConstraint {
    OneToOne,
    OneToMany,
    ManyToOne,
    ManyToMany,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ValidationRule {
    pub allowed_sources: Vec<NodeKind>,
    pub allowed_targets: Vec<NodeKind>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RelationshipDefinition {
    pub kind: RelationshipKind,
    pub properties: HashMap<String, PropertyDefinition>,
    pub validation: ValidationRule,
    pub cardinality: CardinalityConstraint,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct GraphSchema {
    pub nodes: HashMap<NodeKind, NodeDefinition>,
    pub relationships: HashMap<RelationshipKind, RelationshipDefinition>,
}

impl GraphSchema {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn add_node_definition(&mut self, def: NodeDefinition) {
        self.nodes.insert(def.kind.clone(), def);
    }

    pub fn add_relationship_definition(&mut self, def: RelationshipDefinition) {
        self.relationships.insert(def.kind.clone(), def);
    }

    pub fn validate_node(&self, node: &GraphNode) -> Result<(), SchemaError> {
        let def = self
            .nodes
            .get(&node.kind)
            .ok_or_else(|| SchemaError::UnknownNodeKind(node.kind.clone()))?;

        for prop_def in def.properties.values() {
            if prop_def.required && !node.properties.contains_key(&prop_def.name) {
                return Err(SchemaError::MissingRequiredProperty(prop_def.name.clone()));
            }
        }

        Ok(())
    }

    pub fn validate_edge(
        &self,
        edge: &GraphEdge,
        source: &GraphNode,
        target: &GraphNode,
    ) -> Result<(), SchemaError> {
        let def = self
            .relationships
            .get(&edge.kind)
            .ok_or_else(|| SchemaError::UnknownRelationshipKind(edge.kind.clone()))?;

        if !def.validation.allowed_sources.contains(&source.kind)
            || !def.validation.allowed_targets.contains(&target.kind)
        {
            return Err(SchemaError::InvalidRelationship(
                edge.kind.clone(),
                source.kind.clone(),
                target.kind.clone(),
            ));
        }

        for prop_def in def.properties.values() {
            if prop_def.required && !edge.properties.contains_key(&prop_def.name) {
                return Err(SchemaError::MissingRequiredProperty(prop_def.name.clone()));
            }
        }

        Ok(())
    }
}
