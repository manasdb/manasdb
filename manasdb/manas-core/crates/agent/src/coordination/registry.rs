use crate::ids::AgentId;
use crate::models::agent::AgentInstance;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

pub trait AgentRegistry: Send + Sync {
    fn register(&self, agent: AgentInstance) -> Result<(), String>;
    fn unregister(&self, id: &AgentId) -> Result<(), String>;
    fn get_agent(&self, id: &AgentId) -> Option<AgentInstance>;
    fn get_all(&self) -> Vec<AgentInstance>;
}

pub struct InMemoryRegistry {
    agents: Arc<Mutex<HashMap<AgentId, AgentInstance>>>,
}

impl InMemoryRegistry {
    pub fn new() -> Self {
        Self {
            agents: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for InMemoryRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentRegistry for InMemoryRegistry {
    fn register(&self, agent: AgentInstance) -> Result<(), String> {
        self.agents.lock().unwrap().insert(agent.definition.id, agent);
        Ok(())
    }

    fn unregister(&self, id: &AgentId) -> Result<(), String> {
        self.agents.lock().unwrap().remove(id);
        Ok(())
    }

    fn get_agent(&self, id: &AgentId) -> Option<AgentInstance> {
        self.agents.lock().unwrap().get(id).cloned()
    }

    fn get_all(&self) -> Vec<AgentInstance> {
        self.agents.lock().unwrap().values().cloned().collect()
    }
}
