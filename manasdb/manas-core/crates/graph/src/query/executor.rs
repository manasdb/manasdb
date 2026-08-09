use std::time::Instant;
use crate::memory::snapshot::GraphSnapshot;
use super::planner::TraversalPlan;
use super::result::{QueryMetadata, QueryResult};

pub struct QueryExecutor;

impl QueryExecutor {
    pub fn execute(plan: TraversalPlan, snapshot: &GraphSnapshot) -> QueryResult {
        let start_time = Instant::now();
        
        // This is a stub execution that returns everything.
        // A full implementation would apply `plan.query` filters recursively.
        let nodes = snapshot.nodes.clone();
        let edges = snapshot.edges.clone();
        
        let metadata = QueryMetadata {
            execution_time: start_time.elapsed(),
            matched_nodes: nodes.len(),
            matched_edges: edges.len(),
            strategy_used: plan.strategy,
            traversal_depth: plan.query.depth_limit.unwrap_or(0),
            warnings: vec![],
        };
        
        QueryResult {
            nodes,
            edges,
            metadata,
        }
    }
}
