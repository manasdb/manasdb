use crate::entities::{Memory, MemoryContent};
use crate::ids::{IdGenerator, UuidGenerator};
use crate::builders::builder::MemoryBuilder;
use crate::errors::MemoryError;

pub struct MemoryFactory;

impl MemoryFactory {
    pub fn create_text_memory(text: &str) -> Result<Memory, MemoryError> {
        let generator = UuidGenerator;
        MemoryBuilder::new()
            .with_id(generator.generate_memory_id())
            .with_content(MemoryContent::Text {
                content: text.to_string(),
            })
            .build()
    }
}
