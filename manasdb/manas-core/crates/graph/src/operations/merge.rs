use crate::domain::{GraphEdge, GraphNode, GraphProperty};
use crate::identity::{EdgeId, NodeId};
use super::builder::GraphBuilder;

#[derive(Debug, Clone)]
pub enum MergeStrategy {
    ById(NodeId),
    ByBusinessKey(String), // The name of the property that must be unique
    ByCustomResolver,      // Future integration with Phase 9F
}

pub trait GraphMerge {
    /// Merge a node into the graph based on the chosen strategy.
    /// Returns the ID of the node (either existing or newly inserted).
    fn merge_node(&mut self, node: GraphNode, strategy: MergeStrategy) -> NodeId;
    
    /// Merges an edge based on Source, Target, and Kind
    fn merge_edge(&mut self, edge: GraphEdge) -> Result<EdgeId, String>;
}

impl GraphMerge for GraphBuilder {
    fn merge_node(&mut self, node: GraphNode, strategy: MergeStrategy) -> NodeId {
        match strategy {
            MergeStrategy::ById(id) => {
                let mut n = node.clone();
                n.id = id.clone();
                
                if let Some(existing) = self.nodes_mut().get_mut(&id) {
                    // Update properties and metadata
                    for (k, v) in n.properties {
                        existing.properties.insert(k, v);
                    }
                    existing.metadata = n.metadata;
                    id
                } else {
                    self.nodes_mut().insert(id.clone(), n);
                    id
                }
            }
            MergeStrategy::ByBusinessKey(key) => {
                let business_val = node.properties.get(&key);
                
                if let Some(val) = business_val {
                    let mut found_id = None;
                    for (id, existing) in self.nodes() {
                        if existing.kind == node.kind {
                            if let Some(existing_val) = existing.properties.get(&key) {
                                if existing_val == val {
                                    found_id = Some(id.clone());
                                    break;
                                }
                            }
                        }
                    }

                    if let Some(id) = found_id {
                        let existing = self.nodes_mut().get_mut(&id).unwrap();
                        for (k, v) in node.properties {
                            existing.properties.insert(k, v);
                        }
                        existing.metadata = node.metadata;
                        id
                    } else {
                        let id = node.id.clone();
                        self.nodes_mut().insert(id.clone(), node);
                        id
                    }
                } else {
                    // Fallback to inserting a new node if the business key isn't provided
                    let id = node.id.clone();
                    self.nodes_mut().insert(id.clone(), node);
                    id
                }
            }
            MergeStrategy::ByCustomResolver => unimplemented!("Resolved in Phase 9F"),
        }
    }

    fn merge_edge(&mut self, edge: GraphEdge) -> Result<EdgeId, String> {
        if !self.nodes().contains_key(&edge.source) || !self.nodes().contains_key(&edge.target) {
            return Err("Source or target node missing".to_string());
        }

        let mut found_id = None;
        for (id, existing) in self.edges() {
            if existing.source == edge.source && existing.target == edge.target && existing.kind == edge.kind {
                found_id = Some(id.clone());
                break;
            }
        }

        if let Some(id) = found_id {
            let existing = self.edges_mut().get_mut(&id).unwrap();
            for (k, v) in edge.properties {
                existing.properties.insert(k, v);
            }
            Ok(id)
        } else {
            let id = edge.id.clone();
            self.edges_mut().insert(id.clone(), edge);
            Ok(id)
        }
    }
}
