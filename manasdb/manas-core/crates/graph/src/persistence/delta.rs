use crate::domain::{GraphNode, GraphEdge};
use crate::memory::snapshot::GraphVersion;

/// An immutable changeset representing exactly what was modified during a transaction.
#[derive(Debug, Clone)]
pub struct GraphDelta {
    pub version_from: GraphVersion,
    pub version_to: GraphVersion,

    pub inserted_nodes: Vec<GraphNode>,
    pub updated_nodes: Vec<GraphNode>,
    pub deleted_nodes: Vec<GraphNode>,

    pub inserted_edges: Vec<GraphEdge>,
    pub updated_edges: Vec<GraphEdge>,
    pub deleted_edges: Vec<GraphEdge>,
}

impl GraphDelta {
    pub fn new(version_from: GraphVersion, version_to: GraphVersion) -> Self {
        Self {
            version_from,
            version_to,
            inserted_nodes: Vec::new(),
            updated_nodes: Vec::new(),
            deleted_nodes: Vec::new(),
            inserted_edges: Vec::new(),
            updated_edges: Vec::new(),
            deleted_edges: Vec::new(),
        }
    }
}
