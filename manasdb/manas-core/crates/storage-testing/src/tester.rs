use storage_api::traits_v1::{MemoryReader, MemoryWriter};
use memory::entities::memory::{Memory, MemoryContent};
use memory::entities::namespace::NamespacePath;
use memory::ids::types::MemoryId;
use std::sync::Arc;

pub struct ContractTester<T: MemoryReader + MemoryWriter + Send + Sync> {
    store: Arc<T>,
}

impl<T: MemoryReader + MemoryWriter + Send + Sync> ContractTester<T> {
    pub fn new(store: Arc<T>) -> Self {
        Self { store }
    }

    pub async fn run_all(&self) {
        self.test_crud().await;
        // Other tests will be added here
    }

    async fn test_crud(&self) {
        let namespace = NamespacePath::new(vec!["test".to_string()]);
        let id = MemoryId::new("test-id");
        let memory = Memory {
            identity: memory::entities::memory::MemoryIdentity {
                id: id.clone(),
                document_hash: None,
                fingerprint: None,
                namespace: namespace.clone(),
                schema_version: "1.0".to_string(),
            },
            kind: memory::entities::memory::MemoryKind::Semantic,
            source: memory::entities::memory::MemorySource::Document,
            content: MemoryContent::Text { content: "test document".to_string() },
            origin: memory::entities::memory::Origin::System,
            chunks: vec![],
            system_metadata: memory::entities::metadata::SystemMetadata {
                hash: "".to_string(),
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
                version: "1".to_string(),
            },
            user_metadata: Default::default(),
            relations: memory::entities::memory::MemoryRelations { edges: vec![] },
        };

        // 1. Save
        self.store.save(&namespace, &memory).await.expect("Failed to save memory");

        // 2. Load
        let loaded = self.store.load(&namespace, &id).await.expect("Failed to load memory");
        assert!(loaded.is_some(), "Memory should exist");
        assert_eq!(loaded.unwrap().identity.id, id);

        // 3. Delete
        self.store.delete(&namespace, &id).await.expect("Failed to delete memory");

        // 4. Load again (should be None)
        let loaded = self.store.load(&namespace, &id).await.expect("Failed to load memory");
        assert!(loaded.is_none(), "Memory should not exist");
    }
}
