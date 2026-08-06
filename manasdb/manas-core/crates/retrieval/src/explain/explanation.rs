use std::time::Duration;

#[derive(Debug, Clone, Default)]
pub struct Explanation {
    pub planner_decisions: Vec<String>,
    pub optimizer_decisions: Vec<String>,
    pub retrieval_reason: Option<String>,
    pub matched_terms: Vec<String>,
    pub vector_similarity: Option<f32>,
    pub lexical_similarity: Option<f32>,
    pub rerank_score: Option<f32>,
    pub fusion_score: Option<f32>,
    pub metadata_matches: Vec<String>,
    pub filters_applied: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct ExecutionStatistics {
    pub documents_scanned: usize,
    pub documents_filtered: usize,
    pub documents_ranked: usize,
    pub documents_fused: usize,
    pub retrievers_invoked: usize,
    pub rankers_invoked: usize,
    pub execution_time: Duration,
}
