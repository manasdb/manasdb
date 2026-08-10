use crate::ids::TaskId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SchedulingEvents {
    TaskQueued(TaskId),
    TaskReady(TaskId),
    TaskBlocked(TaskId),
    TaskRunning(TaskId),
    TaskCompleted(TaskId),
    TaskFailed(TaskId, String),
}
