use crate::orchestrator::events::{EventBus, Subscriber, EventEnvelope, AgentEvent, Publisher};
use crate::orchestrator::recovery::{RetryStrategy, RecoveryManager, RecoveryAction};
use crate::ids::TaskId;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct MockSubscriber {
    events: Arc<Mutex<Vec<AgentEvent>>>,
}

impl MockSubscriber {
    fn new() -> Self {
        Self { events: Arc::new(Mutex::new(Vec::new())) }
    }
}

impl Subscriber for MockSubscriber {
    fn on_event(&self, envelope: &EventEnvelope) {
        self.events.lock().unwrap().push(envelope.event.clone());
    }
}

#[test]
fn test_event_bus_routing() {
    let bus = EventBus::new();
    let sub = MockSubscriber::new();
    bus.subscribe(Box::new(sub.clone()));

    let task_id = TaskId::new();
    bus.publish(AgentEvent::TaskStarted(task_id), "corr1".to_string());

    let received = sub.events.lock().unwrap();
    assert_eq!(received.len(), 1);
    assert_eq!(received[0], AgentEvent::TaskStarted(task_id));
}

#[test]
fn test_recovery_strategy() {
    let strategy = RetryStrategy::new(3);
    let manager = RecoveryManager::new(Box::new(strategy));
    let task_id = TaskId::new();

    assert_eq!(manager.handle_failure(task_id, "error", 1), RecoveryAction::Retry);
    assert_eq!(manager.handle_failure(task_id, "error", 2), RecoveryAction::Retry);
    assert_eq!(manager.handle_failure(task_id, "error", 3), RecoveryAction::Abort);
}
