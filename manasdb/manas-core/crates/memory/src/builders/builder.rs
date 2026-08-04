use crate::entities::{Memory, MemoryContent, NamespacePath, UserMetadata};
use crate::ids::MemoryId;
use crate::builders::assembler::MemoryAssembler;
use crate::algorithms::hasher::Hasher;

pub struct MemoryBuilder {
    id: Option<MemoryId>,
    content: Option<MemoryContent>,
    namespace: Option<NamespacePath>,
    user_metadata: Option<UserMetadata>,
}

impl Default for MemoryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryBuilder {
    pub fn new() -> Self {
        Self {
            id: None,
            content: None,
            namespace: None,
            user_metadata: None,
        }
    }

    pub fn with_id(mut self, id: MemoryId) -> Self {
        self.id = Some(id);
        self
    }

    pub fn with_content(mut self, content: MemoryContent) -> Self {
        self.content = Some(content);
        self
    }

    pub fn with_namespace(mut self, namespace: NamespacePath) -> Self {
        self.namespace = Some(namespace);
        self
    }

    pub fn with_user_metadata(mut self, meta: UserMetadata) -> Self {
        self.user_metadata = Some(meta);
        self
    }

    pub fn build(self) -> Result<Memory, crate::errors::MemoryError> {
        let content = self.content.ok_or_else(|| {
            crate::errors::MemoryError::Validation("Content is required".to_string())
        })?;
        let id = self.id.ok_or_else(|| {
            crate::errors::MemoryError::Validation("MemoryId is required".to_string())
        })?;
        let namespace = self.namespace.unwrap_or_default();
        let user_metadata = self.user_metadata.unwrap_or_default();

        let hash = match &content {
            MemoryContent::Text { content } => Hasher::default().hash_text(content),
            MemoryContent::Structured { json_payload } => Hasher::default().hash_text(json_payload),
            MemoryContent::Binary { uri } => Hasher::default().hash_text(uri),
            MemoryContent::Reference { target_id } => Hasher::default().hash_text(target_id),
        };

        Ok(MemoryAssembler::assemble(id, content, hash, namespace, user_metadata))
    }
}
