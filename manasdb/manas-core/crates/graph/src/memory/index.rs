use std::collections::{BTreeMap, HashMap};

use crate::identity::{EdgeId, NodeId};
use crate::types::{NodeKind, RelationshipKind};

#[derive(Debug, Clone, Default)]
pub struct GraphIndex {
    pub nodes_by_kind: HashMap<NodeKind, Vec<NodeId>>,
    pub nodes_by_property: HashMap<String, HashMap<String, Vec<NodeId>>>,
    pub edges_by_kind: HashMap<RelationshipKind, Vec<EdgeId>>,
    pub temporal_index: BTreeMap<i64, Vec<NodeId>>,
}

impl GraphIndex {
    pub fn new() -> Self {
        Self::default()
    }
}
