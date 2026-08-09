use super::ast::GraphQuery;
use super::filters::{EdgeFilter, NodeFilter, TemporalFilter};
use crate::identity::NodeId;
use crate::semantic::types::SemanticVectorQuery;
use crate::semantic::hybrid::{FusionStrategy, HybridQuery};

/// Fluent builder for constructing a `GraphQuery`.
pub struct GraphQueryBuilder {
    query: GraphQuery,
    semantic_query: Option<SemanticVectorQuery>,
    fusion_strategy: Option<FusionStrategy>,
}

impl GraphQueryBuilder {
    pub fn new() -> Self {
        Self {
            query: GraphQuery::default(),
            semantic_query: None,
            fusion_strategy: None,
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

    pub fn with_semantic(mut self, query: SemanticVectorQuery, strategy: FusionStrategy) -> Self {
        self.semantic_query = Some(query);
        self.fusion_strategy = Some(strategy);
        self
    }

    pub fn build(self) -> Result<GraphQuery, String> {
        if self.semantic_query.is_some() {
            return Err("This is a hybrid query. Call build_hybrid() instead.".to_string());
        }
        Ok(self.query)
    }

    pub fn build_hybrid(self) -> Result<HybridQuery, String> {
        if let (Some(semantic_query), Some(fusion_strategy)) = (self.semantic_query, self.fusion_strategy) {
            Ok(HybridQuery {
                graph_query: self.query,
                semantic_query,
                fusion_strategy,
            })
        } else {
            Err("Semantic query or fusion strategy missing. Call build() instead.".to_string())
        }
    }
}

impl Default for GraphQueryBuilder {
    fn default() -> Self {
        Self::new()
    }
}
