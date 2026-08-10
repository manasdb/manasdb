use crate::models::{AgentDefinition, Mission, Goal, Task};

pub struct AgentValidator;

impl AgentValidator {
    pub fn validate(agent: &AgentDefinition) -> Result<(), String> {
        if agent.name.is_empty() {
            return Err("Agent name cannot be empty".to_string());
        }
        Ok(())
    }
}

pub struct MissionValidator;

impl MissionValidator {
    pub fn validate(mission: &Mission) -> Result<(), String> {
        if mission.title.is_empty() {
            return Err("Mission title cannot be empty".to_string());
        }
        Ok(())
    }
}

pub struct GoalValidator;

impl GoalValidator {
    pub fn validate(goal: &Goal) -> Result<(), String> {
        if goal.title.is_empty() {
            return Err("Goal title cannot be empty".to_string());
        }
        Ok(())
    }
}

pub struct TaskValidator;

impl TaskValidator {
    pub fn validate(task: &Task) -> Result<(), String> {
        if task.title.is_empty() {
            return Err("Task title cannot be empty".to_string());
        }
        Ok(())
    }
}
