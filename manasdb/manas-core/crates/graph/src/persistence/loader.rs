use crate::query::ast::GraphQuery;
use crate::memory::snapshot::GraphSnapshot;

#[derive(Debug, Clone)]
pub enum HydrationStrategy {
    Full,
    Subgraph(GraphQuery),
}

pub trait SnapshotLoader {
    fn load_snapshot(&self, strategy: HydrationStrategy) -> Result<GraphSnapshot, String>;
}
