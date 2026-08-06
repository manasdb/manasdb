use crate::workflow::Workflow;
use crate::registry::CapabilityRegistry;
use crate::core::types::{Stimulus, CognitiveResult, TelemetryData, ExecutionTrace};
use std::sync::Arc;
use std::collections::HashMap;

use crate::context::WorkingMemory;

pub struct WorkflowExecutor {
    registry: Arc<CapabilityRegistry>,
}

impl WorkflowExecutor {
    pub fn new(registry: Arc<CapabilityRegistry>) -> Self {
        Self { registry }
    }
    
    pub async fn execute(&self, _stimulus: Stimulus, workflow: Workflow, _memory: &mut WorkingMemory) -> Result<CognitiveResult, String> {
        let mut executed_nodes = Vec::new();
        let mut current_node_id = workflow.start_node_id.clone();
        
        // This is a basic mock execution loop just to demonstrate traversal
        // In a real system, inputs/outputs would be dynamically downcasted or mapped
        loop {
            let node = match workflow.get_node(&current_node_id) {
                Some(n) => n,
                None => break, // Workflow finished
            };
            
            executed_nodes.push(node.id.clone());
            
            // Check capability
            if self.registry.get(&node.capability).is_none() {
                return Err(format!("Capability {:?} not found", node.capability));
            }
            
            // Simulate outcome - always continue for now
            let outcome = crate::workflow::ExecutionOutcomeType::Continue;
            
            match node.next.get(&outcome) {
                Some(next_id) => {
                    current_node_id = next_id.clone();
                },
                None => break, // End of workflow
            }
        }
        
        Ok(CognitiveResult {
            plan: None,
            belief_update: None,
            hypotheses: None,
            reflection: None,
            learning: None,
            telemetry: TelemetryData {
                overall_duration_ms: 100,
                start_timestamp: 0,
                total_tokens_used: 0,
                estimated_cost: 0.0,
            },
            metadata: HashMap::new(),
            execution_trace: ExecutionTrace {
                executed_nodes,
                duration_ms: 100,
                warnings: vec![],
            },
        })
    }
}
