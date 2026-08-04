use super::chunk::MemoryChunk;
use super::metadata::{SystemMetadata, UserMetadata};
use super::namespace::NamespacePath;
use crate::ids::MemoryId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MemoryKind {
    Document,
    Semantic,
    Working,
    Episodic,
    Procedural,
    Knowledge,
    Conversation,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MemorySource {
    Document,
    Conversation,
    Image,
    Audio,
    Video,
    Knowledge,
    API,
    Generated,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MemoryContent {
    Text { content: String },
    Structured { json_payload: String },
    Binary { uri: String },
    Reference { target_id: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Origin {
    User,
    Agent,
    Import,
    API,
    Sync,
    Generated,
    System,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MemoryIdentity {
    pub id: MemoryId,
    pub document_hash: Option<String>,
    pub fingerprint: Option<String>,
    pub namespace: NamespacePath,
    pub schema_version: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MemoryRelations {
    pub edges: Vec<MemoryId>,
}

/// The top-level Memory entity modeling all contextual semantics.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Memory {
    pub identity: MemoryIdentity,
    pub kind: MemoryKind,
    pub source: MemorySource,
    pub content: MemoryContent,
    pub origin: Origin,
    pub chunks: Vec<MemoryChunk>,
    pub system_metadata: SystemMetadata,
    pub user_metadata: UserMetadata,
    pub relations: MemoryRelations,
}
