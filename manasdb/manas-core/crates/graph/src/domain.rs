use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use crate::identity::{EdgeId, NodeId};
use crate::metadata::GraphMetadata;
use crate::types::{NodeKind, RelationshipKind};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GraphProperty {
    String(String),
    Int(i64),
    Float(f64),
    Bool(bool),
    Json(Value),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: NodeId,
    pub kind: NodeKind,
    pub properties: HashMap<String, GraphProperty>,
    pub metadata: GraphMetadata,
}

impl GraphNode {
    pub fn new(kind: NodeKind) -> Self {
        Self {
            id: NodeId::new(),
            kind,
            properties: HashMap::new(),
            metadata: GraphMetadata::default(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: EdgeId,
    pub source: NodeId,
    pub target: NodeId,
    pub kind: RelationshipKind,
    pub properties: HashMap<String, GraphProperty>,
    pub metadata: GraphMetadata,
}

impl GraphEdge {
    pub fn new(source: NodeId, target: NodeId, kind: RelationshipKind) -> Self {
        Self {
            id: EdgeId::new(),
            source,
            target,
            kind,
            properties: HashMap::new(),
            metadata: GraphMetadata::default(),
        }
    }
}

