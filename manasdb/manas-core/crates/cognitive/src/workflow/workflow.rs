use std::collections::HashMap;
use crate::workflow::graph::WorkflowNode;

#[derive(Debug, Clone)]
pub struct Workflow {
    pub id: String,
    pub start_node_id: String,
    pub nodes: HashMap<String, WorkflowNode>,
}

impl Workflow {
    pub fn get_node(&self, id: &str) -> Option<&WorkflowNode> {
        self.nodes.get(id)
    }
}
