use crate::identity::NodeId;
use std::collections::HashMap;

/// A signature uniquely identifying an embedding model (e.g., text-embedding-3-small)
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ModelSignature(pub String);

impl Default for ModelSignature {
    fn default() -> Self {
        Self("default_model".to_string())
    }
}

/// Links a Graph NodeId to an external vector embedding
#[derive(Debug, Clone)]
pub struct EmbeddingReference {
    pub node_id: NodeId,
    pub vector_id: String,
    pub model: ModelSignature,
}

#[derive(Debug, Clone)]
pub struct SemanticVectorQuery {
    pub query_string: String,
    pub top_k: usize,
    pub min_score: Option<f32>,
    pub metadata_filters: HashMap<String, String>,
}
