use super::canonicalization::CanonicalEntity;
use super::models::ResolvedEntity;

pub trait ConflictResolver: Send + Sync {
    /// Preserves information by keeping conflicting edges alongside their confidence 
    fn resolve_conflicts(&self, canonical: CanonicalEntity) -> Result<ResolvedEntity, String>;
}
