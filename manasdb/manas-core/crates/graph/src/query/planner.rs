use super::ast::GraphQuery;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExecutionStrategy {
    IndexScan,
    PropertyScan,
    TemporalScan,
    TraversalScan,
}

#[derive(Debug, Clone)]
pub struct TraversalPlan {
    pub strategy: ExecutionStrategy,
    pub query: GraphQuery,
}

pub struct QueryPlanner;

impl QueryPlanner {
    pub fn plan(query: GraphQuery) -> TraversalPlan {
        let strategy = if query.starting_nodes.is_some() {
            ExecutionStrategy::TraversalScan
        } else if query.temporal_filter.is_some() {
            ExecutionStrategy::TemporalScan
        } else if !query.node_filters.is_empty() {
            // Further optimization could inspect if it's ByKind (IndexScan) or ByProperty (PropertyScan)
            ExecutionStrategy::IndexScan
        } else {
            // Fallback
            ExecutionStrategy::IndexScan
        };

        TraversalPlan { strategy, query }
    }
}
