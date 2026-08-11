#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CheckpointPolicy {
    Always,
    EveryTask,
    EveryGoal,
    TimeInterval(u64), // Seconds
    Manual,
}

impl Default for CheckpointPolicy {
    fn default() -> Self {
        Self::EveryTask
    }
}

pub struct CheckpointManager {}

impl CheckpointManager {
    pub fn new() -> Self {
        Self {}
    }
}
