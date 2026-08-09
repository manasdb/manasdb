use cognitive::context::{WorkingMemory, FifoEvictionPolicy};
use cognitive::planning::Goal;

#[test]
fn test_working_memory_isolation_and_continuity() {
    let mut memory_session_a = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    let mut memory_session_b = WorkingMemory::new(Box::new(FifoEvictionPolicy));
    
    // Validate isolation
    let goal_a = Goal {
        id: uuid::Uuid::new_v4(),
        description: "Session A Goal".to_string(),
        priority: 1,
    };
    memory_session_a.context_mut().active_goal = Some(goal_a);
    
    let goal_b = Goal {
        id: uuid::Uuid::new_v4(),
        description: "Session B Goal".to_string(),
        priority: 2,
    };
    memory_session_b.context_mut().active_goal = Some(goal_b);
    
    assert_ne!(
        memory_session_a.context().active_goal.as_ref().unwrap().description,
        memory_session_b.context().active_goal.as_ref().unwrap().description
    );
    
    // Snapshot validation
    let snapshot_a = memory_session_a.snapshot();
    let snapshot_b = memory_session_b.snapshot();
    assert_ne!(snapshot_a.context.active_goal.as_ref().unwrap().description, snapshot_b.context.active_goal.as_ref().unwrap().description);
}
