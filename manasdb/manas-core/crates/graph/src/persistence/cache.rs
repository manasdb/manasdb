use crate::memory::snapshot::{GraphSnapshot, GraphVersion};
use std::collections::HashMap;

/// Cache for reusing snapshots, preventing full hydration from the repository on every query.
pub struct SnapshotCache {
    snapshots: HashMap<GraphVersion, GraphSnapshot>,
}

impl SnapshotCache {
    pub fn new() -> Self {
        Self {
            snapshots: HashMap::new(),
        }
    }

    pub fn get(&self, version: &GraphVersion) -> Option<GraphSnapshot> {
        self.snapshots.get(version).cloned()
    }

    pub fn insert(&mut self, version: GraphVersion, snapshot: GraphSnapshot) {
        self.snapshots.insert(version, snapshot);
    }
}

impl Default for SnapshotCache {
    fn default() -> Self {
        Self::new()
    }
}
