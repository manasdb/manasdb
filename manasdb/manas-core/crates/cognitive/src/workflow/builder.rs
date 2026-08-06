use std::collections::HashMap;
use crate::workflow::graph::WorkflowNode;
use crate::workflow::workflow::Workflow;

pub struct WorkflowBuilder {
    id: String,
    start_node_id: Option<String>,
    nodes: HashMap<String, WorkflowNode>,
}

impl WorkflowBuilder {
    pub fn new(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            start_node_id: None,
            nodes: HashMap::new(),
        }
    }
    
    pub fn set_start_node(mut self, node_id: impl Into<String>) -> Self {
        self.start_node_id = Some(node_id.into());
        self
    }
    
    pub fn add_node(mut self, node: WorkflowNode) -> Self {
        if self.start_node_id.is_none() {
            self.start_node_id = Some(node.id.clone());
        }
        self.nodes.insert(node.id.clone(), node);
        self
    }
    
    pub fn build(self) -> Result<Workflow, String> {
        let start_node_id = self.start_node_id.ok_or("No start node defined")?;
        
        Ok(Workflow {
            id: self.id,
            start_node_id,
            nodes: self.nodes,
        })
    }
}
