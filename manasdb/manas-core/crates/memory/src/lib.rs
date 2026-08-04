//! The `memory` crate provides the core domain model and algorithms for 
//! semantic assembly, deduplication, and hashing. It is entirely agnostic 
//! to storage engines and database connectivity.

pub mod algorithms;
pub mod builders;
pub mod entities;
pub mod errors;
pub mod ids;
pub mod serialization;
pub mod validation;

pub use errors::MemoryError;

#[cfg(test)]
mod tests;
