use crate::models::task::Task;
use crate::orchestrator::services::ToolService;
use crate::tools::ToolResult;
use std::sync::Arc;

pub struct TaskDispatcher {
    tool_service: Arc<dyn ToolService>,
}

impl TaskDispatcher {
    pub fn new(tool_service: Arc<dyn ToolService>) -> Self {
        Self { tool_service }
    }

    pub async fn dispatch(&self, task: &Task) -> Result<ToolResult, String> {
        // Here we could route based on task properties in Phase 10E
        self.tool_service.execute(task).await
    }
}
