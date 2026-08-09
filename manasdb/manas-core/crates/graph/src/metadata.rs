use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreatedAt(pub DateTime<Utc>);

impl Default for CreatedAt {
    fn default() -> Self {
        Self(Utc::now())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdatedAt(pub DateTime<Utc>);

impl Default for UpdatedAt {
    fn default() -> Self {
        Self(Utc::now())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ObservedAt(pub DateTime<Utc>);

impl Default for ObservedAt {
    fn default() -> Self {
        Self(Utc::now())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidFrom(pub DateTime<Utc>);

impl Default for ValidFrom {
    fn default() -> Self {
        Self(Utc::now())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidUntil(pub DateTime<Utc>);

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Confidence(pub f32);

impl Confidence {
    pub fn new(value: f32) -> Self {
        Self(value.clamp(0.0, 1.0))
    }
}

impl Default for Confidence {
    fn default() -> Self {
        Self(1.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Source {
    User,
    Document(String),
    Observation(String),
    Inference(String),
    System,
    Custom(String),
}

impl Default for Source {
    fn default() -> Self {
        Self::System
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct GraphMetadata {
    pub created_at: CreatedAt,
    pub updated_at: UpdatedAt,
    pub observed_at: ObservedAt,
    pub valid_from: ValidFrom,
    pub valid_until: Option<ValidUntil>,
    pub confidence: Confidence,
    pub source: Source,
}
