use crate::errors::TokenizerError;
use crate::traits::{Chunker, Tokenizer};
use crate::types::{Chunk, ChunkOptions};
use regex::Regex;
use std::borrow::Cow;
use std::sync::OnceLock;

/// Provides sliding window chunking over tokenized text, respecting paragraph boundaries.
#[derive(Debug, Clone, Copy)]
pub struct SlidingWindowChunker;

impl<T: Tokenizer> Chunker<T> for SlidingWindowChunker {
    fn chunk<'a>(
        &self,
        text: &'a str,
        tokenizer: &T,
        options: &ChunkOptions,
    ) -> Result<Vec<Chunk<'a>>, TokenizerError> {
        if options.max_tokens == 0 {
            return Err(TokenizerError::InvalidParameters(
                "max_tokens must be greater than 0".to_string(),
            ));
        }
        if options.overlap >= options.max_tokens {
            return Err(TokenizerError::InvalidParameters(
                "overlap must be less than max_tokens".to_string(),
            ));
        }

        let mut chunks = Vec::new();
        let mut chunk_index = 0;

        // In legacy TS: text.replace(/([^\s]{50})/g, '$1 ');
        // For pure parity without allocation if possible, we can just use a paragraph splitter.
        // The TS uses /\n\s*\n/.
        static PARA_RE: OnceLock<Regex> = OnceLock::new();
        let para_re = PARA_RE.get_or_init(|| Regex::new(r"\n\s*\n").unwrap());

        // Split paragraphs and track their original byte offsets in the string
        let mut paragraph_index = 0;
        let mut last_end = 0;

        for m in para_re.find_iter(text) {
            let p_start = last_end;
            let p_end = m.start();
            let paragraph_text = &text[p_start..p_end];
            last_end = m.end();

            if paragraph_text.trim().is_empty() {
                continue;
            }

            self.process_paragraph(
                paragraph_text,
                p_start,
                paragraph_index,
                tokenizer,
                options,
                &mut chunk_index,
                &mut chunks,
            )?;
            paragraph_index += 1;
        }

        // Process final paragraph
        if last_end < text.len() {
            let paragraph_text = &text[last_end..];
            if !paragraph_text.trim().is_empty() {
                self.process_paragraph(
                    paragraph_text,
                    last_end,
                    paragraph_index,
                    tokenizer,
                    options,
                    &mut chunk_index,
                    &mut chunks,
                )?;
            }
        }

        // Enforce max_chunks limit
        if let Some(max) = options.max_chunks {
            chunks.truncate(max);
        }

        Ok(chunks)
    }
}

impl SlidingWindowChunker {
    fn process_paragraph<'a, T: Tokenizer>(
        &self,
        paragraph_text: &'a str,
        paragraph_offset: usize,
        paragraph_index: usize,
        tokenizer: &T,
        options: &ChunkOptions,
        chunk_index: &mut usize,
        chunks: &mut Vec<Chunk<'a>>,
    ) -> Result<(), TokenizerError> {
        let tokens = tokenizer.tokenize(paragraph_text)?;

        if tokens.is_empty() {
            return Ok(());
        }

        let mut i = 0;
        let step = options.max_tokens - options.overlap;

        while i < tokens.len() {
            let end = std::cmp::min(i + options.max_tokens, tokens.len());
            let window = &tokens[i..end];

            let start_offset = paragraph_offset + window.first().unwrap().start_offset;
            let end_offset = paragraph_offset + window.last().unwrap().end_offset;
            
            // To maintain parity with TS which joins words with space:
            // Since we operate on Cow and &str, we extract the exact original slice.
            // This is actually better than TS because it preserves original spacing/punctuation exactly.
            let chunk_text = &paragraph_text[window.first().unwrap().start_offset..window.last().unwrap().end_offset];
            
            let final_text = if options.trim_whitespace {
                chunk_text.trim()
            } else {
                chunk_text
            };

            if final_text.is_empty() && options.drop_empty_chunks {
                if end == tokens.len() {
                    break;
                }
                i += step;
                continue;
            }

            if window.len() >= options.min_chunk_size {
                chunks.push(Chunk {
                    index: *chunk_index,
                    text: Cow::Borrowed(final_text),
                    token_count: window.len(),
                    start_offset,
                    end_offset,
                    paragraph_index,
                });
                *chunk_index += 1;
            }

            if end == tokens.len() {
                break;
            }

            i += step;
        }

        Ok(())
    }
}
