use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct WorkingMemory {
    pub short_term: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct ConversationContext {
    pub messages: Vec<String>,
}

#[derive(Debug, Clone, Default)]
pub struct SessionContext {
    pub session_id: String,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Default)]
pub struct GoalContext {
    pub active_goals: Vec<String>,
}
