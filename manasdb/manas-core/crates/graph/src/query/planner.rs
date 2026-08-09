use super::ast::GraphQuery;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ExecutionStrategy {
    IndexScan,
    PropertyScan,
    TemporalScan,
    TraversalScan,
    HybridScan,
}

use crate::semantic::hybrid::HybridQuery;

#[derive(Debug, Clone)]
pub struct TraversalPlan {
    pub strategy: ExecutionStrategy,
    pub query: GraphQuery,
}

#[derive(Debug, Clone)]
pub struct HybridTraversalPlan {
    pub strategy: ExecutionStrategy, // Always HybridScan
    pub query: HybridQuery,
}

pub struct QueryPlanner;

impl QueryPlanner {
    pub fn plan(query: GraphQuery) -> TraversalPlan {
        let strategy = if query.starting_nodes.is_some() {
            ExecutionStrategy::TraversalScan
        } else if query.temporal_filter.is_some() {
            ExecutionStrategy::TemporalScan
        } else if !query.node_filters.is_empty() {
            ExecutionStrategy::IndexScan
        } else {
            ExecutionStrategy::IndexScan
        };

        TraversalPlan { strategy, query }
    }

    pub fn plan_hybrid(query: HybridQuery) -> HybridTraversalPlan {
        // The FusionStrategy inside the HybridQuery dictates the execution order,
        // but the overarching strategy is HybridScan.
        HybridTraversalPlan {
            strategy: ExecutionStrategy::HybridScan,
            query,
        }
    }
}
