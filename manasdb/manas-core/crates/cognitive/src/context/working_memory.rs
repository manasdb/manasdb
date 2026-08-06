use crate::context::working_context::WorkingContext;
use crate::context::snapshot::WorkingMemorySnapshot;
use crate::context::eviction::EvictionPolicy;

pub struct WorkingMemory {
    context: WorkingContext,
    eviction_policy: Box<dyn EvictionPolicy>,
}

impl WorkingMemory {
    pub fn new(eviction_policy: Box<dyn EvictionPolicy>) -> Self {
        Self {
            context: WorkingContext::new(),
            eviction_policy,
        }
    }
    
    pub fn context(&self) -> &WorkingContext {
        &self.context
    }
    
    pub fn context_mut(&mut self) -> &mut WorkingContext {
        &mut self.context
    }

    pub fn snapshot(&self) -> WorkingMemorySnapshot {
        WorkingMemorySnapshot {
            context: self.context.clone(),
            timestamp: 0, // Placeholder
        }
    }
    
    pub fn evict_if_needed(&mut self) {
        self.eviction_policy.evict();
    }
}
