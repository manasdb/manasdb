use super::types::{ChunkId, EmbeddingId, MemoryId};

/// A trait for pluggable ID generation.
pub trait IdGenerator {
    fn generate_memory_id(&self) -> MemoryId;
    fn generate_chunk_id(&self) -> ChunkId;
    fn generate_embedding_id(&self) -> EmbeddingId;
}

/// A default ID generator using UUID v4.
pub struct UuidGenerator;

impl IdGenerator for UuidGenerator {
    fn generate_memory_id(&self) -> MemoryId {
        MemoryId::new(uuid::Uuid::new_v4().to_string())
    }

    fn generate_chunk_id(&self) -> ChunkId {
        ChunkId::new(uuid::Uuid::new_v4().to_string())
    }

    fn generate_embedding_id(&self) -> EmbeddingId {
        EmbeddingId::new(uuid::Uuid::new_v4().to_string())
    }
}
