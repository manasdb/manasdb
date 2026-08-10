use crate::models::AgentContext;
use crate::models::permissions::ToolPermission;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PermissionError {
    #[error("Agent lacks permission to execute tool: {0}")]
    Denied(String),
}

pub struct PermissionValidator;

impl PermissionValidator {
    pub fn validate(tool_name: &str, context: &AgentContext) -> Result<(), PermissionError> {
        // Simplified validation for Phase 10C.
        // In reality, this would check `context.tool_permissions`.
        // Let's assume there is an ExecuteTool permission or specific tool names.
        let is_allowed = context.tool_permissions.allowed_tools.iter().any(|p| match p {
            ToolPermission::ExecuteTool(_) => true, // Simplification for now, we could check string
            ToolPermission::Custom(allowed_name) if allowed_name == tool_name => true,
            _ => false,
        });

        if is_allowed {
            Ok(())
        } else {
            Err(PermissionError::Denied(tool_name.to_string()))
        }
    }
}
