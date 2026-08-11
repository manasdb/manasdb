use crate::types::NodeKind;
use crate::memory::snapshot::GraphSnapshot;

use super::builder::GraphQueryBuilder;
use super::filters::{NodeFilter, TemporalFilter};
use super::planner::{QueryPlanner, ExecutionStrategy};
use super::executor::QueryExecutor;

#[test]
fn test_query_pipeline_integration() {
    let snapshot = GraphSnapshot {
        version: crate::memory::snapshot::GraphVersion::default(),
        nodes: vec![],
        edges: vec![],
        timestamp: chrono::Utc::now(),
    };
    
    // 1. Build Query
    let query = GraphQueryBuilder::new()
        .with_node_filter(NodeFilter::ByKind(NodeKind::Person))
        .max_depth(2)
        .build()
        .unwrap();
        
    assert_eq!(query.depth_limit, Some(2));
    
    // 2. Plan Query
    let plan = QueryPlanner::plan(query);
    assert_eq!(plan.strategy, ExecutionStrategy::IndexScan); // Should select IndexScan due to NodeFilter
    
    // 3. Execute Query
    let result = QueryExecutor::execute(plan, &snapshot);
    assert_eq!(result.metadata.strategy_used, ExecutionStrategy::IndexScan);
}

#[test]
fn test_planner_strategy_selection() {
    // Test TraversalScan selection
    let query1 = GraphQueryBuilder::new()
        .start_from(vec![crate::identity::NodeId::new()])
        .build()
        .unwrap();
    let plan1 = QueryPlanner::plan(query1);
    assert_eq!(plan1.strategy, ExecutionStrategy::TraversalScan);
    
    // Test TemporalScan selection
    let query2 = GraphQueryBuilder::new()
        .with_temporal_filter(TemporalFilter::After(chrono::Utc::now()))
        .build()
        .unwrap();
    let plan2 = QueryPlanner::plan(query2);
    assert_eq!(plan2.strategy, ExecutionStrategy::TemporalScan);
}
