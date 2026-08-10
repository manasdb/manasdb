use super::models::{KnowledgeFacts, ResolvedKnowledge};
use super::entity::EntityResolver;
use super::canonicalization::Canonicalizer;
use super::conflict::ConflictResolver;
use super::delta_builder::GraphDeltaBuilder;
use graph::persistence::delta::GraphDelta;

pub trait KnowledgeResolver {
    fn resolve_facts(&self, facts: KnowledgeFacts) -> Result<GraphDelta, String>;
}

pub struct StandardKnowledgeResolver {
    entity_resolver: Box<dyn EntityResolver>,
    canonicalizer: Box<dyn Canonicalizer>,
    conflict_resolver: Box<dyn ConflictResolver>,
    delta_builder: Box<dyn GraphDeltaBuilder>,
}

impl StandardKnowledgeResolver {
    pub fn new(
        entity_resolver: Box<dyn EntityResolver>,
        canonicalizer: Box<dyn Canonicalizer>,
        conflict_resolver: Box<dyn ConflictResolver>,
        delta_builder: Box<dyn GraphDeltaBuilder>,
    ) -> Self {
        Self {
            entity_resolver,
            canonicalizer,
            conflict_resolver,
            delta_builder,
        }
    }
}

impl KnowledgeResolver for StandardKnowledgeResolver {
    fn resolve_facts(&self, facts: KnowledgeFacts) -> Result<GraphDelta, String> {
        let mut resolved_entities = Vec::new();
        
        for fact in facts.new_facts {
            let entity = self.entity_resolver.resolve(&fact)?;
            let canonical = self.canonicalizer.canonicalize(&entity)?;
            let resolved = self.conflict_resolver.resolve_conflicts(canonical)?;
            resolved_entities.push(resolved);
        }
        
        let resolved_knowledge = ResolvedKnowledge { resolved_entities };
        self.delta_builder.build_delta(resolved_knowledge)
    }
}
