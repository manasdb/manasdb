use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// System-level metadata that cannot be overwritten by users.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SystemMetadata {
    pub hash: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: String,
}

/// User-defined metadata attached to memories and chunks.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct UserMetadata {
    pub tags: Vec<String>,
    pub attributes: HashMap<String, String>,
    pub custom: HashMap<String, String>,
}

/// A unified metadata structure holding both system and user metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Metadata {
    pub system: SystemMetadata,
    pub user: UserMetadata,
    pub content_hash: Option<String>,
    pub metadata_hash: Option<String>,
}

impl Metadata {
    pub fn new(system: SystemMetadata, user: UserMetadata) -> Self {
        Self {
            system,
            user,
            content_hash: None,
            metadata_hash: None,
        }
    }
}
