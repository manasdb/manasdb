use crate::ids::{MissionId, GoalId, TaskId};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AgentEvent {
    // Domain Events
    MissionStarted(MissionId),
    GoalStarted(GoalId),
    MissionCompleted(MissionId),
    MissionFailed(MissionId, String),

    // Task Events
    TaskStarted(TaskId),
    TaskFinished(TaskId, String), 
    TaskFailed(TaskId, String),   

    // Infrastructure Events
    ReflectionCompleted(TaskId, String),
    RecoveryStarted(TaskId, String),
}

#[derive(Debug, Clone)]
pub struct EventEnvelope {
    pub correlation_id: String,
    pub timestamp: u64,
    pub event: AgentEvent,
}

pub trait Subscriber: Send + Sync {
    fn on_event(&self, envelope: &EventEnvelope);
}

pub trait Publisher: Send + Sync {
    fn publish(&self, event: AgentEvent, correlation_id: String);
}

#[derive(Clone)]
pub struct EventBus {
    subscribers: Arc<Mutex<Vec<Box<dyn Subscriber>>>>,
}

impl EventBus {
    pub fn new() -> Self {
        Self {
            subscribers: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn subscribe(&self, subscriber: Box<dyn Subscriber>) {
        let mut subs = self.subscribers.lock().unwrap();
        subs.push(subscriber);
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

impl Publisher for EventBus {
    fn publish(&self, event: AgentEvent, correlation_id: String) {
        let envelope = EventEnvelope {
            correlation_id,
            timestamp: 0, 
            event,
        };
        
        let subs = self.subscribers.lock().unwrap();
        for sub in subs.iter() {
            sub.on_event(&envelope);
        }
    }
}
