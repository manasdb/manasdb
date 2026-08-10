use crate::interpret::Fact;
use graph::identity::NodeId;

use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeFacts {
    pub new_facts: Vec<Fact>,
}

#[derive(Debug, Clone)]
pub struct ResolvedEntity {
    pub canonical_id: NodeId,
    pub original_fact: Fact,
}

#[derive(Debug, Clone)]
pub struct ResolvedKnowledge {
    pub resolved_entities: Vec<ResolvedEntity>,
}
