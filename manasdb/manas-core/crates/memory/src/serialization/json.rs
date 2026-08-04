use crate::entities::Memory;
use crate::errors::MemoryError;

pub struct JsonSerializer;

impl JsonSerializer {
    pub fn to_string(memory: &Memory) -> Result<String, MemoryError> {
        serde_json::to_string(memory)
            .map_err(|e| MemoryError::Serialization(e.to_string()))
    }

    pub fn to_string_pretty(memory: &Memory) -> Result<String, MemoryError> {
        serde_json::to_string_pretty(memory)
            .map_err(|e| MemoryError::Serialization(e.to_string()))
    }

    pub fn from_string(json: &str) -> Result<Memory, MemoryError> {
        serde_json::from_str(json)
            .map_err(|e| MemoryError::Serialization(e.to_string()))
    }
}
