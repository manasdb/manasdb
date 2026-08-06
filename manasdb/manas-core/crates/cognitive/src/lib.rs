pub mod belief;
pub mod context;
pub mod governance;
pub mod core;
pub mod decision;
pub mod interpret;
pub mod learning;
pub mod memory_evolution;
pub mod observe;
pub mod providers;
pub mod llm;
pub mod registry;
pub mod salience;
pub mod workflow;
pub mod orchestrator;
pub mod planning;
pub mod reasoning;
pub mod reflection;
pub mod state;

pub use crate::core::errors::CognitiveError;
pub use orchestrator::CognitiveOrchestrator;
pub use state::{CognitiveState, StateMachine};
pub use context::{WorkingMemory, WorkingContext};
pub use registry::CapabilityRegistry;

// Domain Models
pub use observe::{Observation, ObservationSource};
pub use interpret::{Fact, Evidence};
pub use reasoning::Hypothesis;
pub use belief::{Belief, MemoryDelta};
pub use decision::Decision;
pub use planning::{Goal, Plan, Action, TaskRequest};
pub use reflection::{Reflection, LearningEvent};

#[cfg(test)]
mod tests;
