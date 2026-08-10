use crate::belief::models::Belief;

pub trait BeliefValidator: Send + Sync {
    /// Validates a belief before it is allowed to mutate the knowledge graph.
    /// Returns Ok(belief) if valid, or an Err string with the reason for rejection.
    fn validate(&self, belief: Belief) -> Result<Belief, String>;
}

pub struct StandardBeliefValidator;

impl BeliefValidator for StandardBeliefValidator {
    fn validate(&self, belief: Belief) -> Result<Belief, String> {
        if belief.truth_value < 0.5 {
            return Err("Belief truth_value too low for knowledge mutation".into());
        }
        Ok(belief)
    }
}
