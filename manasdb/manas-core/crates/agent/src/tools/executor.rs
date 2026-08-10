use crate::models::AgentContext;
use crate::tools::validator::PermissionValidator;
use crate::tools::registry::ToolRegistry;
use crate::tools::sandbox::Sandbox;
use crate::tools::tool::ToolResult;
use std::time::Duration;

pub struct ToolExecutor<'a> {
    registry: &'a ToolRegistry,
}

impl<'a> ToolExecutor<'a> {
    pub fn new(registry: &'a ToolRegistry) -> Self {
        Self { registry }
    }

    pub fn execute(
        &self,
        tool_name: &str,
        args: serde_json::Value,
        context: AgentContext,
    ) -> ToolResult {
        // 1. Permission Validation
        if let Err(e) = PermissionValidator::validate(tool_name, &context) {
            return ToolResult::SystemError(e.to_string());
        }

        // 2. Discover Tool
        let tool = match self.registry.get(tool_name) {
            Some(t) => t,
            None => return ToolResult::Failure(format!("Tool {} not found", tool_name)),
        };

        // 3. Setup Sandbox/Timeouts
        // Example: use the policy from context, defaulting to 5 seconds
        let timeout_ms = context
            .runtime_metadata
            .labels
            .get("timeout_ms")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(5000);

        let timeout = Duration::from_millis(timeout_ms);

        // 4. Execute
        let ctx = context.clone();
        let result = Sandbox::execute_with_timeout(timeout, &context, move || {
            tool.execute(&args, &ctx)
        });

        match result {
            Ok(tool_result) => tool_result,
            Err(e) => ToolResult::SystemError(e.to_string()),
        }
    }
}
