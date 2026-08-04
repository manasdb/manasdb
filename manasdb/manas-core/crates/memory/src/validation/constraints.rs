use crate::errors::MemoryError;

pub struct ConstraintsValidator;

impl ConstraintsValidator {
    pub fn enforce_namespace_rules(namespace_parts: &[String]) -> Result<(), MemoryError> {
        if namespace_parts.is_empty() {
            return Err(MemoryError::Constraint(
                "Namespace must contain at least one part.".to_string(),
            ));
        }
        Ok(())
    }
}
