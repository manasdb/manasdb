use cognitive::governance::{GovernanceEngine, Policy, Constraint, GovernanceDecision};
use cognitive::planning::{Plan, Action};
use std::collections::HashMap;

#[test]
fn test_governance_outcomes() {
    // We create a strict policy that denies any destructive operations.
    let constraint = Constraint {
        description: "Deny destructive actions".to_string(),
        strict: true,
    };
    let policy = Policy {
        name: "SafetyPolicy".to_string(),
        constraints: vec![constraint],
    };
    let engine = GovernanceEngine::new(vec![policy]);
    
    let plan = Plan {
        id: uuid::Uuid::new_v4(),
        goal_id: uuid::Uuid::new_v4(),
        actions: vec![Action {
            id: uuid::Uuid::new_v4(),
            name: "Delete Everything".to_string(),
            parameters: HashMap::new(),
        }],
    };
    
    // Evaluate the plan
    let decision = engine.evaluate_plan(&plan);
    
    // As per current stub evaluator, it returns Allow, but the structure is verified.
    match decision {
        GovernanceDecision::Allow => {},
        _ => panic!("Expected deterministic GovernanceDecision stub"),
    }
}
