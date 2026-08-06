pub mod belief;
pub mod constraints;
pub mod context;
pub mod decision;
pub mod errors;
pub mod goals;
pub mod interpret;
pub mod learning;
pub mod memory_management;
pub mod observe;
pub mod orchestrator;
pub mod planning;
pub mod policies;
pub mod providers;
pub mod reasoning;
pub mod reflection;
pub mod registry;
pub mod salience;
pub mod state;
pub mod tasks;

pub use errors::CognitiveError;
pub use orchestrator::CognitiveOrchestrator;
pub use state::{CognitiveState, StateMachine};
pub use context::{WorkingMemory, GoalContext, SessionContext, ConversationContext};
pub use registry::CapabilityRegistry;

// Domain Models
pub use observe::{Observation, ObservationSource};
pub use interpret::{Fact, Evidence};
pub use reasoning::Hypothesis;
pub use belief::{Belief, MemoryDelta};
pub use decision::Decision;
pub use planning::{Goal, Plan, Action, TaskRequest};
pub use reflection::{Reflection, LearningEvent};
pub use policies::PolicyViolation;
pub use constraints::ConstraintViolation;

#[cfg(test)]
mod tests;
