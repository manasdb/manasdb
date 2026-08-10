use graph::persistence::delta::GraphDelta;

pub trait KnowledgeMaintenance: Send + Sync {
    fn deduplicate(&self) -> Result<GraphDelta, String>;
    fn prune(&self) -> Result<GraphDelta, String>;
    fn update_confidence(&self) -> Result<GraphDelta, String>;
    fn cleanup_dangling_edges(&self) -> Result<GraphDelta, String>;
}
