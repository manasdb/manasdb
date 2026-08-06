use crate::errors::RetrievalError;
use crate::query::query_context::QueryContext;

pub trait RetrievalStage<I, O>: Send + Sync + 'static {
    fn execute(&self, input: I, ctx: &QueryContext) -> Result<O, RetrievalError>;
}

pub trait Retriever: Send + Sync + 'static {
    // Basic stub for concrete retrievers to implement
    fn name(&self) -> &'static str;
}
