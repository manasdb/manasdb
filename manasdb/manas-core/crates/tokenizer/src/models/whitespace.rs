use crate::errors::TokenizerError;
use crate::traits::Tokenizer;
use crate::types::Token;
use std::borrow::Cow;

/// A simple tokenizer that splits text based on whitespace.
/// This matches the exact tokenization behavior of the legacy Node.js SDK.
#[derive(Debug, Clone, Copy)]
pub struct WhitespaceTokenizer;

impl Tokenizer for WhitespaceTokenizer {
    fn tokenize<'a>(&self, text: &'a str) -> Result<Vec<Token<'a>>, TokenizerError> {
        let mut tokens = Vec::new();
        let mut start_idx = 0;
        let mut in_word = false;

        // Iterate over char indices to properly track UTF-8 byte offsets
        for (i, c) in text.char_indices() {
            if c.is_whitespace() {
                if in_word {
                    tokens.push(Token {
                        text: Cow::Borrowed(&text[start_idx..i]),
                        start_offset: start_idx,
                        end_offset: i,
                        id: None,
                    });
                    in_word = false;
                }
            } else {
                if !in_word {
                    start_idx = i;
                    in_word = true;
                }
            }
        }

        // Handle the final word if the text doesn't end with whitespace
        if in_word {
            tokens.push(Token {
                text: Cow::Borrowed(&text[start_idx..text.len()]),
                start_offset: start_idx,
                end_offset: text.len(),
                id: None,
            });
        }

        Ok(tokens)
    }
}
