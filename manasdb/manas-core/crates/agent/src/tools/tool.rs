use crate::models::AgentContext;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ToolSchema {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ToolResult {
    Success(serde_json::Value),
    Failure(String),
    SystemError(String),
}

pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn schema(&self) -> ToolSchema;
    
    // For Phase 10C, we simulate execution synchronously.
    // In a real async runtime (Phase 10F), this might return a Future.
    fn execute(&self, args: &serde_json::Value, context: &AgentContext) -> ToolResult;
}
