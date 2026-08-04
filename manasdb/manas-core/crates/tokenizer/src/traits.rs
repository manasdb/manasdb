use crate::errors::TokenizerError;
use crate::types::{Chunk, ChunkOptions, Token};

/// A trait for extracting tokens from text.
pub trait Tokenizer {
    /// Tokenizes the given text, returning a list of `Token`s with their byte offsets.
    fn tokenize<'a>(&self, text: &'a str) -> Result<Vec<Token<'a>>, TokenizerError>;

    /// Returns the total number of tokens in the given text.
    /// Default implementation tokenizes the string and counts the result.
    fn count_tokens(&self, text: &str) -> Result<usize, TokenizerError> {
        Ok(self.tokenize(text)?.len())
    }
}

/// A trait for chunking text based on token boundaries.
pub trait Chunker<T: Tokenizer> {
    /// Chunks the given text into multiple `Chunk`s using the provided tokenizer and options.
    fn chunk<'a>(
        &self,
        text: &'a str,
        tokenizer: &T,
        options: &ChunkOptions,
    ) -> Result<Vec<Chunk<'a>>, TokenizerError>;
}
