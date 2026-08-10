use super::entity::IdentifiedEntity;
use graph::identity::NodeId;

#[derive(Debug, Clone)]
pub struct CanonicalEntity {
    pub id: NodeId,
    pub source: IdentifiedEntity,
}

pub trait Canonicalizer: Send + Sync {
    /// Executes graph queries to merge aliases and find the canonical NodeId
    fn canonicalize(&self, entity: &IdentifiedEntity) -> Result<CanonicalEntity, String>;
}
