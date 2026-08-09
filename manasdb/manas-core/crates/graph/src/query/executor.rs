use std::time::Instant;
use crate::memory::snapshot::GraphSnapshot;
use super::planner::{TraversalPlan, HybridTraversalPlan};
use super::result::{QueryMetadata, QueryResult};
use crate::semantic::provider::SemanticProvider;
use crate::semantic::hybrid::FusionStrategy;

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

    pub fn execute_hybrid<P: SemanticProvider>(
        plan: HybridTraversalPlan,
        snapshot: &GraphSnapshot,
        provider: &P,
    ) -> Result<QueryResult, String> {
        let start_time = Instant::now();
        
        let semantic_results = provider.search(&plan.query.semantic_query)?;
        
        // Very basic mock intersection based on FusionStrategy
        // In reality, this would perform actual graph traversal intersected with vector search results.
        let nodes = match plan.query.fusion_strategy {
            FusionStrategy::Intersection => {
                let semantic_ids: std::collections::HashSet<_> = semantic_results.iter().map(|r| r.node_id).collect();
                snapshot.nodes.iter().filter(|n| semantic_ids.contains(&n.id)).cloned().collect()
            },
            _ => snapshot.nodes.clone(),
        };

        let metadata = QueryMetadata {
            execution_time: start_time.elapsed(),
            matched_nodes: nodes.len(),
            matched_edges: snapshot.edges.len(), // Mock
            strategy_used: plan.strategy,
            traversal_depth: plan.query.graph_query.depth_limit.unwrap_or(0),
            warnings: vec![],
        };

        Ok(QueryResult {
            nodes,
            edges: snapshot.edges.clone(),
            metadata,
        })
    }
}
