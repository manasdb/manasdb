use crate::ids::EmbeddingId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Represents the actual vector payload, supporting multiple representation formats.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum EmbeddingData {
    Dense { vector: Vec<f32> },
    Sparse { indices: Vec<u32>, values: Vec<f32> },
    Binary { bytes: Vec<u8> },
    Quantized { vector: Vec<i8>, scale: f32 },
    External { vector_id: String },
}

/// A fully qualified embedding tied to a specific model.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Embedding {
    pub id: EmbeddingId,
    pub provider: String,
    pub model: String,
    pub dimensions: usize,
    pub created_at: DateTime<Utc>,
    pub data: EmbeddingData,
}
