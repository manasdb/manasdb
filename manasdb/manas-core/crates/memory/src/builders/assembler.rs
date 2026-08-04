use crate::entities::{
    Memory, MemoryContent, MemoryIdentity, MemoryKind, MemoryRelations, MemorySource, Origin,
    SystemMetadata, UserMetadata,
};
use crate::ids::MemoryId;
use chrono::Utc;

pub struct MemoryAssembler;

impl MemoryAssembler {
    pub fn assemble(
        id: MemoryId,
        content: MemoryContent,
        hash: String,
        namespace: crate::entities::NamespacePath,
        user_metadata: UserMetadata,
    ) -> Memory {
        let identity = MemoryIdentity {
            id,
            document_hash: Some(hash.clone()),
            fingerprint: None,
            namespace,
            schema_version: "v1".to_string(),
        };

        let system_metadata = SystemMetadata {
            hash,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: "v1".to_string(),
        };

        Memory {
            identity,
            kind: MemoryKind::Document,
            source: MemorySource::API,
            content,
            origin: Origin::System,
            chunks: vec![],
            system_metadata,
            user_metadata,
            relations: MemoryRelations { edges: vec![] },
        }
    }
}
