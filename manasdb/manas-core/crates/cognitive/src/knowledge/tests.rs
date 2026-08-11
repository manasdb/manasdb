use super::models::{KnowledgeFacts, ResolvedKnowledge, ResolvedEntity};
use super::entity::{EntityResolver, IdentifiedEntity};
use super::canonicalization::{Canonicalizer, CanonicalEntity};
use super::conflict::ConflictResolver;
use super::delta_builder::GraphDeltaBuilder;
use super::resolver::{KnowledgeResolver, StandardKnowledgeResolver};
use crate::interpret::Fact;
use graph::identity::NodeId;
use graph::memory::snapshot::GraphVersion;
use graph::persistence::delta::GraphDelta;

struct MockEntityResolver;
impl EntityResolver for MockEntityResolver {
    fn resolve(&self, fact: &Fact) -> Result<IdentifiedEntity, String> {
        Ok(IdentifiedEntity {
            fact: fact.clone(),
            business_keys: vec!["key1".to_string()],
        })
    }
}

struct MockCanonicalizer;
impl Canonicalizer for MockCanonicalizer {
    fn canonicalize(&self, entity: &IdentifiedEntity) -> Result<CanonicalEntity, String> {
        Ok(CanonicalEntity {
            id: NodeId::new(),
            source: entity.clone(),
        })
    }
}

struct MockConflictResolver;
impl ConflictResolver for MockConflictResolver {
    fn resolve_conflicts(&self, canonical: CanonicalEntity) -> Result<ResolvedEntity, String> {
        Ok(ResolvedEntity {
            canonical_id: canonical.id,
            original_fact: canonical.source.fact,
        })
    }
}

struct MockDeltaBuilder;
impl GraphDeltaBuilder for MockDeltaBuilder {
    fn build_delta(&self, _knowledge: ResolvedKnowledge) -> Result<GraphDelta, String> {
        Ok(GraphDelta::new(GraphVersion::default(), GraphVersion::default()))
    }
}

#[test]
fn test_knowledge_resolution_pipeline() {
    let resolver = StandardKnowledgeResolver::new(
        Box::new(MockEntityResolver),
        Box::new(MockCanonicalizer),
        Box::new(MockConflictResolver),
        Box::new(MockDeltaBuilder),
    );

    let facts = KnowledgeFacts {
        new_facts: vec![Fact::new("Test", vec![])],
    };

    let result = resolver.resolve_facts(facts);
    assert!(result.is_ok());
}
