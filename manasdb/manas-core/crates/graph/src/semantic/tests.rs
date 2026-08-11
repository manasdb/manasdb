use crate::identity::NodeId;
use crate::domain::GraphNode;
use crate::types::NodeKind;
use crate::memory::snapshot::GraphSnapshot;

use super::provider::SemanticProvider;
use super::types::{SemanticVectorQuery, ModelSignature};
use super::result::SemanticResult;
use super::hybrid::FusionStrategy;

use crate::query::builder::GraphQueryBuilder;
use crate::query::planner::{QueryPlanner, ExecutionStrategy};
use crate::query::executor::QueryExecutor;

use std::collections::HashMap;

// Mock provider for testing
struct MockProvider {
    mock_results: Vec<SemanticResult>,
}

impl SemanticProvider for MockProvider {
    fn search(&self, _query: &SemanticVectorQuery) -> Result<Vec<SemanticResult>, String> {
        Ok(self.mock_results.clone())
    }
}

#[test]
fn test_hybrid_query_planner() {
    let sem_query = SemanticVectorQuery {
        query_string: "test".to_string(),
        top_k: 5,
        min_score: None,
        metadata_filters: HashMap::new(),
    };
    
    let query = GraphQueryBuilder::new()
        .with_semantic(sem_query, FusionStrategy::SemanticFirst)
        .build_hybrid()
        .unwrap();
        
    let plan = QueryPlanner::plan_hybrid(query);
    assert_eq!(plan.strategy, ExecutionStrategy::HybridScan);
}

#[test]
fn test_fusion_strategy_intersection() {
    // Generate snapshot with 5 nodes
    let mut snapshot = GraphSnapshot {
        version: crate::memory::snapshot::GraphVersion::default(),
        nodes: vec![],
        edges: vec![],
        timestamp: chrono::Utc::now(),
    };
    
    let n1 = NodeId::new();
    let n2 = NodeId::new();
    let n3 = NodeId::new();
    
    let mut node1 = GraphNode::new(NodeKind::Document); node1.id = n1.clone();
    let mut node2 = GraphNode::new(NodeKind::Document); node2.id = n2.clone();
    let mut node3 = GraphNode::new(NodeKind::Document); node3.id = n3.clone();
    
    snapshot.nodes.push(node1);
    snapshot.nodes.push(node2);
    snapshot.nodes.push(node3);
    
    // Mock Provider returns n1 and n2
    let provider = MockProvider {
        mock_results: vec![
            SemanticResult {
                node_id: n1.clone(),
                score: 0.9,
                embedding_model: ModelSignature::default(),
                metadata: HashMap::new(),
            },
            SemanticResult {
                node_id: n2.clone(),
                score: 0.8,
                embedding_model: ModelSignature::default(),
                metadata: HashMap::new(),
            },
        ],
    };
    
    let sem_query = SemanticVectorQuery {
        query_string: "test".to_string(),
        top_k: 5,
        min_score: None,
        metadata_filters: HashMap::new(),
    };
    
    let query = GraphQueryBuilder::new()
        .with_semantic(sem_query, FusionStrategy::Intersection)
        .build_hybrid()
        .unwrap();
        
    let plan = QueryPlanner::plan_hybrid(query);
    let result = QueryExecutor::execute_hybrid(plan, &snapshot, &provider).unwrap();
    
    // Graph has n1, n2, n3. Semantic returns n1, n2. Intersection -> n1, n2.
    assert_eq!(result.metadata.matched_nodes, 2);
    
    let ids: Vec<NodeId> = result.nodes.into_iter().map(|n| n.id).collect();
    assert!(ids.contains(&n1));
    assert!(ids.contains(&n2));
    assert!(!ids.contains(&n3));
}
