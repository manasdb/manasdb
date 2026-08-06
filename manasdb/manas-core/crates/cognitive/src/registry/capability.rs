use crate::providers::{
    ObserveProvider, InterpretProvider, ReasoningProvider,
    ReflectionProvider, PlanningProvider,
};
use std::sync::Arc;

#[derive(Default)]
pub struct CapabilityRegistry {
    pub observe_providers: Vec<Arc<dyn ObserveProvider>>,
    pub interpret_providers: Vec<Arc<dyn InterpretProvider>>,
    pub reasoning_providers: Vec<Arc<dyn ReasoningProvider>>,
    pub reflection_providers: Vec<Arc<dyn ReflectionProvider>>,
    pub planning_providers: Vec<Arc<dyn PlanningProvider>>,
}

impl CapabilityRegistry {
    pub fn new() -> Self {
        Self::default()
    }
}
