use super::ast::GraphQuery;
use super::filters::{EdgeFilter, NodeFilter, TemporalFilter};
use crate::identity::NodeId;

/// Fluent builder for constructing a `GraphQuery`.
pub struct GraphQueryBuilder {
    query: GraphQuery,
}

impl GraphQueryBuilder {
    pub fn new() -> Self {
        Self {
            query: GraphQuery::default(),
        }
    }

    pub fn with_node_filter(mut self, filter: NodeFilter) -> Self {
        self.query.node_filters.push(filter);
        self
    }

    pub fn with_edge_filter(mut self, filter: EdgeFilter) -> Self {
        self.query.edge_filters.push(filter);
        self
    }

    pub fn with_temporal_filter(mut self, filter: TemporalFilter) -> Self {
        self.query.temporal_filter = Some(filter);
        self
    }

    pub fn max_depth(mut self, depth: usize) -> Self {
        self.query.depth_limit = Some(depth);
        self
    }

    pub fn start_from(mut self, nodes: Vec<NodeId>) -> Self {
        self.query.starting_nodes = Some(nodes);
        self
    }

    pub fn build(self) -> GraphQuery {
        self.query
    }
}

impl Default for GraphQueryBuilder {
    fn default() -> Self {
        Self::new()
    }
}
