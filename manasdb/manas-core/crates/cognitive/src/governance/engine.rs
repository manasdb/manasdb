use crate::planning::models::Plan;
use crate::governance::decision::GovernanceDecision;
use crate::governance::policy::Policy;
use crate::governance::evaluator::GovernanceEvaluator;

pub struct GovernanceEngine {
    pub policies: Vec<Policy>,
}

impl GovernanceEngine {
    pub fn new(policies: Vec<Policy>) -> Self {
        Self { policies }
    }

    pub fn evaluate_plan(&self, plan: &Plan) -> GovernanceDecision {
        GovernanceEvaluator::evaluate(plan, &self.policies)
    }
}
