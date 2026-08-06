use async_trait::async_trait;
use memory::entities::memory::Memory;
use memory::entities::namespace::NamespacePath;
use memory::ids::types::MemoryId;
use crate::errors::StorageError;

#[async_trait]
pub trait MemoryReader: Send + Sync {
    async fn load(
        &self,
        namespace: &NamespacePath,
        id: &MemoryId,
    ) -> Result<Option<Memory>, StorageError>;
}

#[async_trait]
pub trait MemoryWriter: Send + Sync {
    async fn save(
        &self,
        namespace: &NamespacePath,
        memory: &Memory,
    ) -> Result<(), StorageError>;

    async fn delete(
        &self,
        namespace: &NamespacePath,
        id: &MemoryId,
    ) -> Result<(), StorageError>;
}

pub trait MemoryStore: MemoryReader + MemoryWriter {}
