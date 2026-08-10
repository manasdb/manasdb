#[cfg(test)]
mod tests {
    use crate::ids::*;
    use crate::capabilities::*;
    use crate::lifecycle::*;
    use crate::metadata::*;
    use crate::models::agent::*;
    use crate::models::goal::*;
    use crate::models::task::*;
    use crate::models::mission::*;
    use crate::models::policy::*;
    use crate::models::configuration::*;
    use crate::models::execution::*;
    use crate::models::permissions::*;
    use crate::validation::*;

    use serde_json::json;
    use std::collections::HashMap;

    #[test]
    fn test_identity_uniqueness_and_serialization() {
        let id1 = AgentId::new();
        let id2 = AgentId::new();
        assert_ne!(id1, id2);

        let serialized = serde_json::to_string(&id1).unwrap();
        let deserialized: AgentId = serde_json::from_str(&serialized).unwrap();
        assert_eq!(id1, deserialized);
    }

    #[test]
    fn test_lifecycle_serialization() {
        let state = AgentState::Executing;
        let serialized = serde_json::to_string(&state).unwrap();
        assert_eq!(serialized, "\"Executing\"");

        let deserialized: AgentState = serde_json::from_str("\"Executing\"").unwrap();
        assert_eq!(state, deserialized);
        
        let invalid = serde_json::from_str::<AgentState>("\"InvalidState\"");
        assert!(invalid.is_err());
    }

    #[test]
    fn test_context_isolation() {
        let context = AgentContext {
            session_id: SessionId::new(),
            mission_id: MissionId::new(),
            active_goal: None,
            execution_trace: ExecutionTrace::default(),
            working_memory_snapshot: WorkingMemoryState { size_bytes: 0, active_items: 0 },
            knowledge_snapshot: KnowledgeState { active_nodes: 0, active_edges: 0 },
            tool_permissions: ToolPermissions { allowed_tools: vec![] },
            runtime_metadata: AgentMetadata::default(),
        };

        // Ensure Context has no static configuration
        assert_eq!(context.tool_permissions.allowed_tools.len(), 0);
    }

    #[test]
    fn test_golden_serialization() {
        let goal = Goal {
            id: GoalId::new(),
            title: "Test Goal".into(),
            description: "A goal for testing".into(),
            priority: Priority::High,
            status: GoalStatus::Pending,
            parent_goal: None,
            constraints: vec![],
            success_conditions: vec!["Done".into()],
        };

        let serialized = serde_json::to_string(&goal).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(parsed["title"], "Test Goal");
        assert_eq!(parsed["priority"], "High");
        assert_eq!(parsed["status"], "Pending");
    }

    use crate::planning::dag::{TaskGraph, TaskNode, DependencyEdge, DependencyType, TaskSchedulingMetadata};
    use crate::scheduling::{TaskReadiness, DefaultScheduler, Scheduler};

    #[test]
    fn test_dag_cycle_detection() {
        let mut graph = TaskGraph::new();
        let t1 = Task::default();
        let t2 = Task::default();
        
        let mut n1 = TaskNode {
            task: t1.clone(),
            scheduling_metadata: TaskSchedulingMetadata { readiness: TaskReadiness::Ready, retry_count: 0 },
            runtime_metadata: HashMap::new(),
        };
        let mut n2 = TaskNode {
            task: t2.clone(),
            scheduling_metadata: TaskSchedulingMetadata { readiness: TaskReadiness::Ready, retry_count: 0 },
            runtime_metadata: HashMap::new(),
        };

        graph.add_task(n1);
        graph.add_task(n2);

        graph.add_dependency(DependencyEdge {
            from: t1.id,
            to: t2.id,
            dependency_type: DependencyType::FinishToStart,
            condition: None,
            metadata: HashMap::new(),
        }).unwrap();

        let res = graph.add_dependency(DependencyEdge {
            from: t2.id,
            to: t1.id,
            dependency_type: DependencyType::FinishToStart,
            condition: None,
            metadata: HashMap::new(),
        });

        assert!(res.is_err()); // Cycle detected
    }

    #[test]
    fn test_parallel_branches_unblocking() {
        let mut graph = TaskGraph::new();
        let a = Task::default();
        let b = Task::default();
        let c = Task::default();

        let make_node = |t: &Task| TaskNode {
            task: t.clone(),
            scheduling_metadata: TaskSchedulingMetadata { readiness: TaskReadiness::WaitingDependency, retry_count: 0 },
            runtime_metadata: HashMap::new(),
        };

        let na = make_node(&a);
        
        graph.add_task(na);
        graph.add_task(make_node(&b));
        graph.add_task(make_node(&c));

        // A -> B, A -> C
        let make_edge = |from, to| DependencyEdge {
            from, to, dependency_type: DependencyType::FinishToStart, condition: None, metadata: HashMap::new()
        };
        graph.add_dependency(make_edge(a.id, b.id)).unwrap();
        graph.add_dependency(make_edge(a.id, c.id)).unwrap();

        let mut scheduler = DefaultScheduler::new();
        
        // A is ready
        let events = scheduler.step(&mut graph);
        assert_eq!(events.len(), 1); 

        // Execute A
        let next = scheduler.next_task(&graph).unwrap();
        assert_eq!(next, a.id);

        // Complete A, should unblock B and C
        let complete_events = scheduler.complete_task(next, &mut graph);
        // complete A, ready B, ready C
        assert_eq!(complete_events.len(), 3); 
        
        let unblocked = graph.get_unblocked_tasks();
        assert_eq!(unblocked.len(), 2);
    }

    #[test]
    fn test_topological_sort() {
        let mut graph = TaskGraph::new();
        let make_node = |t: &Task| TaskNode {
            task: t.clone(),
            scheduling_metadata: TaskSchedulingMetadata { readiness: TaskReadiness::WaitingDependency, retry_count: 0 },
            runtime_metadata: HashMap::new(),
        };

        let t1 = Task::default();
        let t2 = Task::default();
        let t3 = Task::default();

        graph.add_task(make_node(&t1));
        graph.add_task(make_node(&t2));
        graph.add_task(make_node(&t3));

        // t1 -> t2 -> t3
        let make_edge = |from, to| DependencyEdge {
            from, to, dependency_type: DependencyType::FinishToStart, condition: None, metadata: HashMap::new()
        };
        graph.add_dependency(make_edge(t1.id, t2.id)).unwrap();
        graph.add_dependency(make_edge(t2.id, t3.id)).unwrap();

        let sort_result = graph.topological_sort().unwrap();
        
        // Output order should be t1, t2, t3
        assert_eq!(sort_result, vec![t1.id, t2.id, t3.id]);
    }

    #[test]
    fn test_large_dag_performance() {
        let mut graph = TaskGraph::new();
        let num_nodes = 1000;
        let mut prev_task: Option<TaskId> = None;

        for _ in 0..num_nodes {
            let t = Task::default();
            let node = TaskNode {
                task: t.clone(),
                scheduling_metadata: TaskSchedulingMetadata { readiness: TaskReadiness::WaitingDependency, retry_count: 0 },
                runtime_metadata: HashMap::new(),
            };
            graph.add_task(node);

            if let Some(prev) = prev_task {
                let edge = DependencyEdge {
                    from: prev,
                    to: t.id,
                    dependency_type: DependencyType::FinishToStart,
                    condition: None,
                    metadata: HashMap::new(),
                };
                graph.add_dependency(edge).unwrap();
            }
            prev_task = Some(t.id);
        }

        let sorted = graph.topological_sort().unwrap();
        assert_eq!(sorted.len(), num_nodes);
        assert!(!graph.has_cycle()); // internal util method test indirectly
    }
}
