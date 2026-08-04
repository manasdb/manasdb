//! The `tokenizer` crate provides pure, side-effect-free string manipulation, 
//! chunking algorithms, and token counting. It operates independently of any 
//! specific embedding model or storage layer.

pub mod chunkers;
pub mod errors;
pub mod models;
pub mod traits;
pub mod types;

#[cfg(test)]
mod tests;

pub use chunkers::SlidingWindowChunker;
pub use errors::TokenizerError;
pub use models::WhitespaceTokenizer;
pub use traits::{Chunker, Tokenizer};
pub use types::{Chunk, ChunkOptions, ChunkStrategy, Token};
