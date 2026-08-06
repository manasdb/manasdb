use async_trait::async_trait;
use memory::entities::memory::Memory;
use memory::entities::namespace::NamespacePath;
use memory::ids::types::MemoryId;
use storage_api::errors_v1::StorageError;
use storage_api::traits_v1::{MemoryReader, MemoryWriter, StorageAdapter, Connection};
use storage_api::types_v1::{StorageCapability, HealthStatus};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct MockStorage {
    memories: Arc<RwLock<HashMap<String, Memory>>>,
    capabilities: HashSet<StorageCapability>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MockConfig {}

impl StorageAdapter for MockStorage {
    type Config = MockConfig;

    fn new(_config: Self::Config) -> Result<Self, StorageError> {
        let mut capabilities = HashSet::new();
        capabilities.insert(StorageCapability::Namespaces);
        Ok(Self {
            memories: Arc::new(RwLock::new(HashMap::new())),
            capabilities,
        })
    }

    fn name(&self) -> &'static str { "MockStorage" }
    fn version(&self) -> &'static str { "1.0" }
    fn engine(&self) -> &'static str { "Memory" }
    fn capabilities(&self) -> &HashSet<StorageCapability> { &self.capabilities }
}

#[async_trait]
impl Connection for MockStorage {
    async fn connect(&self) -> Result<(), StorageError> { Ok(()) }
    async fn disconnect(&self) -> Result<(), StorageError> { Ok(()) }
    async fn is_connected(&self) -> Result<bool, StorageError> { Ok(true) }
    async fn health_check(&self) -> Result<HealthStatus, StorageError> { Ok(HealthStatus::Healthy) }
}

#[async_trait]
impl MemoryReader for MockStorage {
    async fn load(
        &self,
        namespace: &NamespacePath,
        id: &MemoryId,
    ) -> Result<Option<Memory>, StorageError> {
        let key = format!("{}:{}", namespace.to_string(), id.to_string());
        let map = self.memories.read().await;
        Ok(map.get(&key).cloned())
    }
}

#[async_trait]
impl MemoryWriter for MockStorage {
    async fn save(
        &self,
        namespace: &NamespacePath,
        memory: &Memory,
    ) -> Result<(), StorageError> {
        let key = format!("{}:{}", namespace.to_string(), memory.identity.id.to_string());
        let mut map = self.memories.write().await;
        map.insert(key, memory.clone());
        Ok(())
    }

    async fn delete(
        &self,
        namespace: &NamespacePath,
        id: &MemoryId,
    ) -> Result<(), StorageError> {
        let key = format!("{}:{}", namespace.to_string(), id.to_string());
        let mut map = self.memories.write().await;
        map.remove(&key);
        Ok(())
    }
}
