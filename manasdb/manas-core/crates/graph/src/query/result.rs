use crate::domain::{GraphEdge, GraphNode};
use super::planner::ExecutionStrategy;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct QueryMetadata {
    pub execution_time: Duration,
    pub matched_nodes: usize,
    pub matched_edges: usize,
    pub strategy_used: ExecutionStrategy,
    pub traversal_depth: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct QueryResult {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub metadata: QueryMetadata,
}
