#[derive(Debug, Clone)]
pub enum GovernanceDecision {
    Allow,
    AllowWithWarnings(Vec<String>),
    Reject(String),
    Modify(crate::planning::models::Plan),
    RequireApproval(String),
}
