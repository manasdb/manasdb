//! The `vector` crate provides deterministic, allocation-free, platform-independent 
//! mathematical primitives for all higher-level ManasDB crates.
//! It intentionally contains no storage, runtime, pipeline, or AI-specific logic.

pub mod errors;
pub mod math;

#[cfg(test)]
mod tests;

pub use errors::VectorError;
pub use math::{
    cosine_similarity, dot_product, euclidean_distance, is_normalized, l2_norm, manhattan_distance,
    normalize,
};
