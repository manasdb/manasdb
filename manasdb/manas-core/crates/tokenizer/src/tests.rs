use crate::chunkers::SlidingWindowChunker;
use crate::models::WhitespaceTokenizer;
use crate::traits::{Chunker, Tokenizer};
use crate::types::{Chunk, ChunkOptions, Token};
use std::fs;
use std::path::PathBuf;

fn get_corpus_dir() -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("../../../manas-specification/v1/corpus/english");
    path
}

#[test]
fn test_golden_corpus_english() {
    let corpus_dir = get_corpus_dir();
    let input_path = corpus_dir.join("input.txt");
    let text = fs::read_to_string(&input_path).unwrap();

    let tokenizer = WhitespaceTokenizer;
    let tokens = tokenizer.tokenize(&text).unwrap();

    let expected_tokens_path = corpus_dir.join("expected_tokens.json");
    if !expected_tokens_path.exists() {
        fs::write(&expected_tokens_path, serde_json::to_string_pretty(&tokens).unwrap()).unwrap();
    }
    let expected_tokens_str = fs::read_to_string(&expected_tokens_path).unwrap();
    let expected_tokens: Vec<Token> = serde_json::from_str(&expected_tokens_str).unwrap();
    assert_eq!(tokens, expected_tokens);

    let chunker = SlidingWindowChunker;
    let options = ChunkOptions {
        max_tokens: 5,
        overlap: 2,
        ..Default::default()
    };
    let chunks = chunker.chunk(&text, &tokenizer, &options).unwrap();

    let expected_chunks_path = corpus_dir.join("expected_chunks.json");
    if !expected_chunks_path.exists() {
        fs::write(&expected_chunks_path, serde_json::to_string_pretty(&chunks).unwrap()).unwrap();
    }
    let expected_chunks_str = fs::read_to_string(&expected_chunks_path).unwrap();
    let expected_chunks: Vec<Chunk> = serde_json::from_str(&expected_chunks_str).unwrap();
    assert_eq!(chunks, expected_chunks);
}

#[test]
fn test_whitespace_tokenizer_basic() {
    let tokenizer = WhitespaceTokenizer;
    let text = "Hello world\nTest";
    let tokens = tokenizer.tokenize(text).unwrap();
    
    assert_eq!(tokens.len(), 3);
    assert_eq!(tokens[0].text, "Hello");
    assert_eq!(tokens[1].text, "world");
    assert_eq!(tokens[2].text, "Test");
}

#[test]
fn test_sliding_window_chunker() {
    let tokenizer = WhitespaceTokenizer;
    let chunker = SlidingWindowChunker;
    let text = "This is a simple test document for the English language corpus.\nIt contains multiple sentences.\n\nAnd a second paragraph right here.";
    
    let options = ChunkOptions {
        max_tokens: 5,
        overlap: 2,
        ..Default::default()
    };

    let chunks = chunker.chunk(text, &tokenizer, &options).unwrap();
    
    // We expect the text to be chunked with overlap.
    assert!(!chunks.is_empty());
}

// Property tests
use proptest::prelude::*;

proptest! {
    #[test]
    fn prop_tokenizer_no_panic(s in "\\PC*") {
        let tokenizer = WhitespaceTokenizer;
        let _ = tokenizer.tokenize(&s);
    }
    
    #[test]
    fn prop_chunker_no_panic(s in "\\PC*") {
        let tokenizer = WhitespaceTokenizer;
        let chunker = SlidingWindowChunker;
        let options = ChunkOptions::default();
        let _ = chunker.chunk(&s, &tokenizer, &options);
    }
}
