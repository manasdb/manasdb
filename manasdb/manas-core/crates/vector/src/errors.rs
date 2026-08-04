use thiserror::Error;

#[derive(Error, Debug, PartialEq, Eq, Clone, Copy)]
pub enum VectorError {
    #[error("Vectors must have the same dimension (expected {expected}, found {found})")]
    DimensionMismatch { expected: usize, found: usize },

    #[error("Vector has zero magnitude, operation cannot be performed")]
    ZeroMagnitude,

    #[error("Vector cannot be empty")]
    EmptyVector,

    #[error("Vector contains non-finite values (NaN or infinity)")]
    NonFiniteValue,

    #[error("Invalid dimension for this operation")]
    InvalidDimension,
}
