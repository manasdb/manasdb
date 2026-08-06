use async_trait::async_trait;
use memory::entities::memory::Memory;
use memory::entities::namespace::NamespacePath;
use memory::ids::types::MemoryId;
use crate::errors::StorageError;
use crate::types::v1::{BatchResult, SchemaVersion};

#[async_trait]
pub trait Transaction: Send + Sync {
    async fn commit(self: Box<Self>) -> Result<(), StorageError>;
    async fn rollback(self: Box<Self>) -> Result<(), StorageError>;
}

#[async_trait]
pub trait TransactionStore: Send + Sync {
    async fn begin(&self) -> Result<Box<dyn Transaction>, StorageError>;
}

#[async_trait]
pub trait BatchOperations: Send + Sync {
    async fn insert_batch(
        &self,
        namespace: &NamespacePath,
        memories: &[Memory],
    ) -> Result<BatchResult, StorageError>;

    async fn update_batch(
        &self,
        namespace: &NamespacePath,
        memories: &[Memory],
    ) -> Result<BatchResult, StorageError>;

    async fn delete_batch(
        &self,
        namespace: &NamespacePath,
        ids: &[MemoryId],
    ) -> Result<BatchResult, StorageError>;
}

#[async_trait]
pub trait StorageMigrator: Send + Sync {
    async fn migrate(
        &self,
        from: SchemaVersion,
        to: SchemaVersion,
    ) -> Result<(), StorageError>;
}
