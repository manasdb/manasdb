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
}
