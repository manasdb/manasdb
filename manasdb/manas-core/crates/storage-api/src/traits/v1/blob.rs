use async_trait::async_trait;
use memory::entities::namespace::NamespacePath;
use tokio::io::AsyncRead;
use std::pin::Pin;
use crate::errors::StorageError;

pub type BlobReader = Pin<Box<dyn AsyncRead + Send + Sync>>;

#[derive(Debug, Clone)]
pub struct BlobMetadata {
    pub size_bytes: u64,
    pub mime_type: Option<String>,
}

#[async_trait]
pub trait BlobStore: Send + Sync {
    async fn put(
        &self,
        namespace: &NamespacePath,
        id: &str,
        stream: BlobReader,
    ) -> Result<(), StorageError>;

    async fn get(
        &self,
        namespace: &NamespacePath,
        id: &str,
    ) -> Result<Option<BlobReader>, StorageError>;

    async fn delete(
        &self,
        namespace: &NamespacePath,
        id: &str,
    ) -> Result<(), StorageError>;

    async fn exists(
        &self,
        namespace: &NamespacePath,
        id: &str,
    ) -> Result<bool, StorageError>;

    async fn metadata(
        &self,
        namespace: &NamespacePath,
        id: &str,
    ) -> Result<BlobMetadata, StorageError>;
}
