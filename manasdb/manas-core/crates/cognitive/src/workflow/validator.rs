use crate::workflow::Workflow;
use crate::registry::CapabilityRegistry;
pub struct WorkflowValidator;

impl WorkflowValidator {
    pub fn validate(workflow: &Workflow, registry: &CapabilityRegistry) -> Result<(), String> {
        // Check if start node exists
        if !workflow.nodes.contains_key(&workflow.start_node_id) {
            return Err(format!("Start node '{}' not found in workflow", workflow.start_node_id));
        }

        // Check if start node exists
        for (node_id, node) in &workflow.nodes {
            // Check if capabilities exist in the registry
            if registry.get(&node.capability).is_none() {
                return Err(format!("Capability '{:?}' required by node '{}' is not registered", node.capability, node_id));
            }
            
            // Check if next nodes exist
            for target_node_id in node.next.values() {
                if !workflow.nodes.contains_key(target_node_id) {
                    return Err(format!("Node '{}' references non-existent next node '{}'", node_id, target_node_id));
                }
            }
        }
        
        Ok(())
    }
}
