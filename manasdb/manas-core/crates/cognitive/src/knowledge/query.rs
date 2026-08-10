use graph::query::result::QueryResult;
use graph::semantic::hybrid::HybridQuery;

pub trait KnowledgeQueryService: Send + Sync {
    /// Allows cognitive engines to query knowledge without depending directly on GraphSnapshot
    fn query(&self, query: HybridQuery) -> Result<QueryResult, String>;
}
