use super::types::SemanticVectorQuery;
use super::result::SemanticResult;

/// A generic trait implemented by higher-level application layers or retrieval crates.
/// Decouples the Graph crate from actual Vector Database implementations.
pub trait SemanticProvider {
    fn search(&self, query: &SemanticVectorQuery) -> Result<Vec<SemanticResult>, String>;
}
