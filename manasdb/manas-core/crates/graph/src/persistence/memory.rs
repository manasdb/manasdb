use std::sync::{Arc, Mutex};
use std::collections::HashMap;

use crate::memory::snapshot::{GraphSnapshot, GraphVersion};
use crate::domain::{GraphNode, GraphEdge};
use crate::identity::{NodeId, EdgeId};
use super::repository::{GraphRepository, BackendCapabilities};
use super::loader::{SnapshotLoader, HydrationStrategy};
use super::transaction::GraphTransaction;
use super::delta::GraphDelta;

pub struct InMemoryBackend {
    nodes: Arc<Mutex<HashMap<NodeId, GraphNode>>>,
    edges: Arc<Mutex<HashMap<EdgeId, GraphEdge>>>,
    current_version: Arc<Mutex<GraphVersion>>,
}

impl InMemoryBackend {
    pub fn new() -> Self {
        Self {
            nodes: Arc::new(Mutex::new(HashMap::new())),
            edges: Arc::new(Mutex::new(HashMap::new())),
            current_version: Arc::new(Mutex::new(GraphVersion(1))), // Start at version 1
        }
    }
}

impl Default for InMemoryBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl GraphRepository for InMemoryBackend {
    fn capabilities(&self) -> BackendCapabilities {
        BackendCapabilities {
            transactions: true,
            lazy_loading: true,
            streaming: false,
            snapshots: true,
            schema_migrations: false,
        }
    }

    fn begin_transaction(&self) -> Result<Box<dyn GraphTransaction>, String> {
        Ok(Box::new(InMemoryTransaction {
            backend_nodes: self.nodes.clone(),
            backend_edges: self.edges.clone(),
            backend_version: self.current_version.clone(),
            staged_deltas: Vec::new(),
        }))
    }
}

impl SnapshotLoader for InMemoryBackend {
    fn load_snapshot(&self, strategy: HydrationStrategy) -> Result<GraphSnapshot, String> {
        let nodes_lock = self.nodes.lock().unwrap();
        let edges_lock = self.edges.lock().unwrap();
        let _version_lock = self.current_version.lock().unwrap();

        match strategy {
            HydrationStrategy::Full => {
                Ok(GraphSnapshot {
                    version: _version_lock.clone(),
                    nodes: nodes_lock.values().cloned().collect(),
                    edges: edges_lock.values().cloned().collect(),
                    timestamp: chrono::Utc::now(),
                })
            }
            HydrationStrategy::Subgraph(_query) => {
                // In memory, we just return the full graph for now as a mock for Subgraph.
                Ok(GraphSnapshot {
                    version: _version_lock.clone(),
                    nodes: nodes_lock.values().cloned().collect(),
                    edges: edges_lock.values().cloned().collect(),
                    timestamp: chrono::Utc::now(),
                })
            }
        }
    }
}

pub struct InMemoryTransaction {
    backend_nodes: Arc<Mutex<HashMap<NodeId, GraphNode>>>,
    backend_edges: Arc<Mutex<HashMap<EdgeId, GraphEdge>>>,
    backend_version: Arc<Mutex<GraphVersion>>,
    staged_deltas: Vec<GraphDelta>,
}

impl GraphTransaction for InMemoryTransaction {
    fn apply(&mut self, delta: GraphDelta) -> Result<(), String> {
        let current_ver = self.backend_version.lock().unwrap().0;
        if delta.version_from.0 != current_ver {
            return Err(format!("Optimistic Concurrency Control Failed: Expected version {}, but backend is at {}", delta.version_from.0, current_ver));
        }
        self.staged_deltas.push(delta);
        Ok(())
    }

    fn commit(self: Box<Self>) -> Result<(), String> {
        let mut nodes_lock = self.backend_nodes.lock().unwrap();
        let mut edges_lock = self.backend_edges.lock().unwrap();
        let mut version_lock = self.backend_version.lock().unwrap();

        for delta in self.staged_deltas {
            for node in delta.inserted_nodes.into_iter().chain(delta.updated_nodes) {
                nodes_lock.insert(node.id.clone(), node);
            }
            for node in delta.deleted_nodes {
                nodes_lock.remove(&node.id);
            }

            for edge in delta.inserted_edges.into_iter().chain(delta.updated_edges) {
                edges_lock.insert(edge.id.clone(), edge);
            }
            for edge in delta.deleted_edges {
                edges_lock.remove(&edge.id);
            }

            *version_lock = delta.version_to;
        }

        Ok(())
    }

    fn rollback(self: Box<Self>) -> Result<(), String> {
        // Deltas are dropped, nothing to do
        Ok(())
    }
}
