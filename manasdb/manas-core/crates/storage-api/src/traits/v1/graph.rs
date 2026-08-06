use async_trait::async_trait;
use memory::entities::namespace::NamespacePath;
use crate::errors::StorageError;

// Placeholder structs for Phase 9 Graph
#[derive(Debug, Clone)]
pub struct EdgeId(pub String);

#[derive(Debug, Clone)]
pub struct NodeId(pub String);

#[derive(Debug, Clone)]
pub struct Edge {
    pub id: EdgeId,
    pub source: NodeId,
    pub target: NodeId,
    pub weight: f32,
    pub relation_type: String,
}

#[async_trait]
pub trait GraphStore: Send + Sync {
    async fn save_edge(
        &self,
        namespace: &NamespacePath,
        edge: &Edge,
    ) -> Result<(), StorageError>;

    async fn delete_edge(
        &self,
        namespace: &NamespacePath,
        edge_id: &EdgeId,
    ) -> Result<(), StorageError>;

    async fn neighbors(
        &self,
        namespace: &NamespacePath,
        node_id: &NodeId,
    ) -> Result<Vec<Edge>, StorageError>;

    async fn degree(
        &self,
        namespace: &NamespacePath,
        node_id: &NodeId,
    ) -> Result<usize, StorageError>;
}
