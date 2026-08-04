use crate::errors::MemoryError;

pub struct Validator;

impl Validator {
    pub fn validate_not_empty(text: &str) -> Result<(), MemoryError> {
        if text.trim().is_empty() {
            return Err(MemoryError::Validation(
                "Text content cannot be empty".to_string(),
            ));
        }
        Ok(())
    }
}
