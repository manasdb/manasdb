use crate::models::{Constraint, Task};
use crate::models::execution::ResourceBudget;

pub struct ConstraintEvaluator;

impl ConstraintEvaluator {
    pub fn evaluate(_task: &Task, _current_budget: &ResourceBudget) -> Result<(), String> {
        // Find if this task has its own constraints (assuming task inherited them from goal or they are passed down)
        // For 10B, we can just stub this to return Ok for now, simulating that constraints are met.
        Ok(())
    }

    pub fn evaluate_global(constraints: &[Constraint], current_budget: &ResourceBudget) -> Result<(), String> {
        for constraint in constraints {
            match constraint {
                Constraint::Deadline(deadline) => {
                    if chrono::Utc::now() > *deadline {
                        return Err("Deadline exceeded".to_string());
                    }
                }
                Constraint::Budget(budget) => {
                    // Very simple budget check simulation
                    if let (Some(limit), Some(current)) = (budget.cost_budget, current_budget.cost_budget) {
                        if current > limit {
                            return Err("Cost budget exceeded".to_string());
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }
}
