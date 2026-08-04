use serde::{Deserialize, Serialize};
use std::borrow::Cow;

/// Represents a single token extracted from text.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Token<'a> {
    /// The string representation of the token.
    pub text: Cow<'a, str>,
    /// The UTF-8 byte offset where this token starts in the original text.
    pub start_offset: usize,
    /// The UTF-8 byte offset where this token ends in the original text.
    pub end_offset: usize,
    /// An optional vocabulary ID for the token (e.g. for BPE tokenizers).
    pub id: Option<u32>,
}

/// Represents a chunk of text produced by a chunking algorithm.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Chunk<'a> {
    /// The sequential index of this chunk.
    pub index: usize,
    /// The string content of the chunk.
    pub text: Cow<'a, str>,
    /// The number of tokens contained in this chunk.
    pub token_count: usize,
    /// The UTF-8 byte offset where this chunk starts in the original text.
    pub start_offset: usize,
    /// The UTF-8 byte offset where this chunk ends in the original text.
    pub end_offset: usize,
    /// The index of the paragraph this chunk belongs to (if applicable).
    pub paragraph_index: usize,
}

/// Configuration options for chunking algorithms.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChunkOptions {
    /// The maximum number of tokens allowed per chunk.
    pub max_tokens: usize,
    /// The number of tokens to overlap between adjacent chunks.
    pub overlap: usize,
    /// Whether to preserve paragraph boundaries strictly.
    pub preserve_paragraphs: bool,
    /// Whether to trim leading/trailing whitespace from chunks.
    pub trim_whitespace: bool,
    /// The maximum number of chunks to produce (useful for limits).
    pub max_chunks: Option<usize>,
    /// The minimum size of a chunk. If a trailing chunk is smaller, it might be dropped or merged.
    pub min_chunk_size: usize,
    /// Whether to drop completely empty chunks.
    pub drop_empty_chunks: bool,
}

impl Default for ChunkOptions {
    fn default() -> Self {
        Self {
            max_tokens: 100,
            overlap: 20,
            preserve_paragraphs: true,
            trim_whitespace: true,
            max_chunks: None,
            min_chunk_size: 1,
            drop_empty_chunks: true,
        }
    }
}

/// Strategies available for chunking.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChunkStrategy {
    /// A sliding window that respects paragraph boundaries.
    SlidingWindow,
    /// Chunks strictly by paragraphs.
    Paragraph,
    /// Chunks strictly by sentences.
    Sentence,
    /// Recursively breaks down text based on multiple separators.
    Recursive,
    /// Semantic chunking based on embedding similarity (deferred to cognitive runtime).
    Semantic,
}
