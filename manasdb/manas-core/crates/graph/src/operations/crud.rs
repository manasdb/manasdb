use crate::domain::{GraphEdge, GraphNode};
use crate::identity::{EdgeId, NodeId};
use super::builder::GraphBuilder;

/// Basic CRUD operations acting on a GraphBuilder
pub trait GraphOperations {
    fn insert_node(&mut self, node: GraphNode);
    fn update_node(&mut self, node: GraphNode) -> Result<(), String>;
    fn delete_node(&mut self, id: &NodeId) -> bool;

    fn insert_edge(&mut self, edge: GraphEdge) -> Result<(), String>;
    fn delete_edge(&mut self, id: &EdgeId) -> bool;
}

impl GraphOperations for GraphBuilder {
    fn insert_node(&mut self, node: GraphNode) {
        self.nodes_mut().insert(node.id.clone(), node);
    }

    fn update_node(&mut self, node: GraphNode) -> Result<(), String> {
        if !self.nodes().contains_key(&node.id) {
            return Err("Node does not exist".to_string());
        }
        self.nodes_mut().insert(node.id.clone(), node);
        Ok(())
    }

    fn delete_node(&mut self, id: &NodeId) -> bool {
        if self.nodes_mut().remove(id).is_some() {
            // Must also remove dangling edges
            self.edges_mut().retain(|_, edge| edge.source != *id && edge.target != *id);
            true
        } else {
            false
        }
    }

    fn insert_edge(&mut self, edge: GraphEdge) -> Result<(), String> {
        if !self.nodes().contains_key(&edge.source) || !self.nodes().contains_key(&edge.target) {
            return Err("Source or target node missing".to_string());
        }
        self.edges_mut().insert(edge.id.clone(), edge);
        Ok(())
    }

    fn delete_edge(&mut self, id: &EdgeId) -> bool {
        self.edges_mut().remove(id).is_some()
    }
}
