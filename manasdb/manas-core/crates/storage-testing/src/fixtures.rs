pub struct BenchmarkFixtures;

impl BenchmarkFixtures {
    pub fn create_memories(count: usize) -> Vec<memory::entities::memory::Memory> {
        let mut memories = Vec::with_capacity(count);
        for i in 0..count {
            let id = memory::ids::types::MemoryId::new(&format!("bench-{}", i));
            let namespace = memory::entities::namespace::NamespacePath::new(vec!["bench".to_string()]);
            memories.push(memory::entities::memory::Memory {
                identity: memory::entities::memory::MemoryIdentity {
                    id: id.clone(),
                    document_hash: None,
                    fingerprint: None,
                    namespace: namespace.clone(),
                    schema_version: "1.0".to_string(),
                },
                kind: memory::entities::memory::MemoryKind::Semantic,
                source: memory::entities::memory::MemorySource::Document,
                content: memory::entities::memory::MemoryContent::Text { content: "benchmark".to_string() },
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
            });
        }
        memories
    }
}
