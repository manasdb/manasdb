use std::sync::Arc;
use std::collections::HashMap;

use crate::core::traits::CapabilityId;
use crate::observe::engine::ObservationEngine;
use crate::interpret::engine::InterpretationEngine;
use crate::reasoning::engine::ReasoningEngine;
use crate::belief::engine::BeliefEngine;
use crate::decision::engine::DecisionEngine;
use crate::planning::engine::PlanningEngine;
use crate::reflection::engine::ReflectionEngine;
use crate::learning::engine::LearningEngine;
use crate::memory_evolution::engine::MemoryEvolutionEngine;

pub enum Capability {
    Observe(Arc<dyn ObservationEngine>),
    Interpret(Arc<dyn InterpretationEngine>),
    Reasoning(Arc<dyn ReasoningEngine>),
    Belief(Arc<dyn BeliefEngine>),
    Decision(Arc<dyn DecisionEngine>),
    Planning(Arc<dyn PlanningEngine>),
    Reflection(Arc<dyn ReflectionEngine>),
    Learning(Arc<dyn LearningEngine>),
    MemoryEvolution(Arc<dyn MemoryEvolutionEngine>),
}

#[derive(Default)]
pub struct CapabilityRegistry {
    pub engines: HashMap<CapabilityId, Capability>,
}

impl CapabilityRegistry {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn register(&mut self, id: CapabilityId, capability: Capability) {
        self.engines.insert(id, capability);
    }
    
    pub fn get(&self, id: &CapabilityId) -> Option<&Capability> {
        self.engines.get(id)
    }
    
    pub fn default_registry() -> Self {
        let mut registry = Self::new();
        
        registry.register(
            CapabilityId::Observe, 
            Capability::Observe(Arc::new(crate::observe::DefaultObservationEngine::new()))
        );
        registry.register(
            CapabilityId::Interpret, 
            Capability::Interpret(Arc::new(crate::interpret::DefaultInterpretationEngine::new()))
        );
        registry.register(
            CapabilityId::Reasoning, 
            Capability::Reasoning(Arc::new(crate::reasoning::DefaultReasoningEngine::new()))
        );
        registry.register(
            CapabilityId::Belief, 
            Capability::Belief(Arc::new(crate::belief::DefaultBeliefEngine::new()))
        );
        registry.register(
            CapabilityId::Decision, 
            Capability::Decision(Arc::new(crate::decision::DefaultDecisionEngine::new()))
        );
        registry.register(
            CapabilityId::Planning, 
            Capability::Planning(Arc::new(crate::planning::DefaultPlanningEngine::new()))
        );
        registry.register(
            CapabilityId::Reflection, 
            Capability::Reflection(Arc::new(crate::reflection::DefaultReflectionEngine::new()))
        );
        registry.register(
            CapabilityId::Learning, 
            Capability::Learning(Arc::new(crate::learning::DefaultLearningEngine::new()))
        );
        registry.register(
            CapabilityId::MemoryEvolution, 
            Capability::MemoryEvolution(Arc::new(crate::memory_evolution::DefaultMemoryEvolutionEngine::new()))
        );
        
        registry
    }
}
