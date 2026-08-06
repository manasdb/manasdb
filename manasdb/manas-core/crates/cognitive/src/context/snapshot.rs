use crate::context::working_context::WorkingContext;

#[derive(Debug, Clone)]
pub struct WorkingMemorySnapshot {
    pub context: WorkingContext,
    pub timestamp: u64,
}
