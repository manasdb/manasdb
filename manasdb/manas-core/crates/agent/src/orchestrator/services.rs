use async_trait::async_trait;
use crate::models::{mission::Mission, goal::Goal, task::Task};
use crate::ids::TaskId;
use crate::planning::dag::TaskGraph;
use crate::tools::ToolResult;

#[async_trait]
pub trait PlanningService: Send + Sync {
    async fn plan_mission(&self, mission: &Mission) -> Result<TaskGraph, String>;
    async fn plan_goal(&self, goal: &Goal) -> Result<TaskGraph, String>;
    async fn replan(&self, current_graph: &TaskGraph, failure_context: &str) -> Result<TaskGraph, String>;
}

#[async_trait]
pub trait ToolService: Send + Sync {
    async fn execute(&self, task: &Task) -> Result<ToolResult, String>;
}

#[async_trait]
pub trait SchedulerService: Send + Sync {
    async fn next_task(&mut self, graph: &TaskGraph) -> Option<TaskId>;
    async fn complete_task(&mut self, id: TaskId, graph: &mut TaskGraph) -> Result<(), String>;
    async fn fail_task(&mut self, id: TaskId, reason: String, graph: &mut TaskGraph) -> Result<(), String>;
}

#[async_trait]
pub trait KnowledgeService: Send + Sync {
    async fn store_insight(&self, insight: &str) -> Result<(), String>;
    async fn retrieve_context(&self, query: &str) -> Result<String, String>;
}

#[async_trait]
pub trait CognitiveService: Send + Sync {
    async fn observe(&self, input: &str) -> Result<String, String>;
    async fn reflect(&self, observation: &str) -> Result<String, String>;
}
