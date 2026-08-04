use crate::errors::MemoryError;

pub struct LimitsValidator;

impl LimitsValidator {
    pub fn validate_text_length(text: &str, max_bytes: usize) -> Result<(), MemoryError> {
        if text.len() > max_bytes {
            return Err(MemoryError::Validation(format!(
                "Text length {} exceeds maximum allowed length of {} bytes.",
                text.len(),
                max_bytes
            )));
        }
        Ok(())
    }
}
