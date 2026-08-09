use crate::types::{NodeKind, RelationshipKind};
use crate::identity::NodeId;
use super::filters::{EdgeFilter, NodeFilter, TemporalFilter};

/// Immutable GraphQuery AST representing a declared read query.
#[derive(Debug, Clone)]
pub struct GraphQuery {
    pub node_filters: Vec<NodeFilter>,
    pub edge_filters: Vec<EdgeFilter>,
    pub temporal_filter: Option<TemporalFilter>,
    pub depth_limit: Option<usize>,
    pub starting_nodes: Option<Vec<NodeId>>,
}

impl Default for GraphQuery {
    fn default() -> Self {
        Self {
            node_filters: Vec::new(),
            edge_filters: Vec::new(),
            temporal_filter: None,
            depth_limit: None,
            starting_nodes: None,
        }
    }
}
