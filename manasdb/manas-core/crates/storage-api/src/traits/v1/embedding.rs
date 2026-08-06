use async_trait::async_trait;
use memory::entities::embedding::Embedding;
use memory::entities::namespace::NamespacePath;
use memory::ids::types::ChunkId;
use crate::errors::StorageError;

#[async_trait]
pub trait EmbeddingStore: Send + Sync {
    async fn save_embeddings(
        &self,
        namespace: &NamespacePath,
        chunk_id: &ChunkId,
        embeddings: &[Embedding],
    ) -> Result<(), StorageError>;

    async fn get_embeddings(
        &self,
        namespace: &NamespacePath,
        chunk_id: &ChunkId,
    ) -> Result<Vec<Embedding>, StorageError>;

    async fn delete_embeddings(
        &self,
        namespace: &NamespacePath,
        chunk_id: &ChunkId,
    ) -> Result<(), StorageError>;
}
