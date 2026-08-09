use crate::query::ast::GraphQuery;
use super::types::SemanticVectorQuery;

#[derive(Debug, Clone, PartialEq)]
pub enum FusionStrategy {
    SemanticFirst,
    GraphFirst,
    Intersection,
    Union,
    Weighted(f32, f32), // Semantic Weight, Graph Weight
}

#[derive(Debug, Clone)]
pub struct HybridQuery {
    pub graph_query: GraphQuery,
    pub semantic_query: SemanticVectorQuery,
    pub fusion_strategy: FusionStrategy,
}
