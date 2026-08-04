use super::embedding::Embedding;
use super::metadata::Metadata;
use crate::ids::ChunkId;
use serde::{Deserialize, Serialize};

/// A discreet block of memory (e.g. a paragraph) along with its associated embeddings and metadata.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MemoryChunk {
    pub id: ChunkId,
    pub text: String,
    pub embeddings: Vec<Embedding>,
    pub system_metadata: Metadata,
    pub user_metadata: Metadata,
}
