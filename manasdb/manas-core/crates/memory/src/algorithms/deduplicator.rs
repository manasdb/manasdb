use crate::entities::MemoryChunk;
use std::collections::HashSet;

pub struct Deduplicator;

impl Deduplicator {
    pub fn new() -> Self {
        Self
    }

    /// Deduplicates a list of chunks based on their exact text content.
    /// Returns a new vector containing only unique chunks.
    pub fn deduplicate_chunks(&self, chunks: Vec<MemoryChunk>) -> Vec<MemoryChunk> {
        let mut unique_texts = HashSet::new();
        let mut deduplicated = Vec::new();

        for chunk in chunks {
            if unique_texts.insert(chunk.text.clone()) {
                deduplicated.push(chunk);
            }
        }

        deduplicated
    }
}

impl Default for Deduplicator {
    fn default() -> Self {
        Self::new()
    }
}
