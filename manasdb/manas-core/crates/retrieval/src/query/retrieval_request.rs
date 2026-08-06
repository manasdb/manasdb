use crate::query::query::Query;
use crate::query::query_context::QueryContext;

#[derive(Debug, Clone)]
pub struct RetrievalRequest {
    pub query: Query,
    pub context: QueryContext,
}

impl RetrievalRequest {
    pub fn new(query: Query, context: QueryContext) -> Self {
        Self { query, context }
    }
}
