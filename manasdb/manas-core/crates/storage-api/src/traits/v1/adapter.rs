use async_trait::async_trait;
use serde::{de::DeserializeOwned, Serialize};
use std::collections::HashSet;
use crate::errors::StorageError;
use crate::types::v1::{StorageCapability, HealthStatus};

#[async_trait]
pub trait Connection: Send + Sync {
    async fn connect(&self) -> Result<(), StorageError>;
    async fn disconnect(&self) -> Result<(), StorageError>;
    async fn is_connected(&self) -> Result<bool, StorageError>;
    async fn health_check(&self) -> Result<HealthStatus, StorageError>;
}

pub trait StorageAdapter: Send + Sync + 'static {
    type Config: Serialize + DeserializeOwned;

    fn new(config: Self::Config) -> Result<Self, StorageError>
    where
        Self: Sized;

    fn name(&self) -> &'static str;
    fn version(&self) -> &'static str;
    fn engine(&self) -> &'static str;
    fn capabilities(&self) -> &HashSet<StorageCapability>;
}
