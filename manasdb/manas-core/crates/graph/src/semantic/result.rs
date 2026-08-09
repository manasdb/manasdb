use crate::identity::NodeId;
use std::collections::HashMap;
use super::types::ModelSignature;

#[derive(Debug, Clone)]
pub struct SemanticResult {
    pub node_id: NodeId,
    pub score: f32,
    pub embedding_model: ModelSignature,
    pub metadata: HashMap<String, String>,
}
