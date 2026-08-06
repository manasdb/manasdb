use crate::stage::PipelineStage;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

pub struct StageRegistry {
    // Map of stage ID to the actual Stage instance
    stages: HashMap<String, Arc<dyn PipelineStage>>,
    // Map of capability (e.g. "text/tokenization") to a set of stage IDs providing it
    capabilities: HashMap<String, HashSet<String>>,
}

impl StageRegistry {
    pub fn new() -> Self {
        Self {
            stages: HashMap::new(),
            capabilities: HashMap::new(),
        }
    }

    pub fn register(&mut self, stage: Arc<dyn PipelineStage>, capabilities: Vec<String>) {
        let id = stage.id().to_string();
        self.stages.insert(id.clone(), stage);
        
        for cap in capabilities {
            self.capabilities
                .entry(cap)
                .or_insert_with(HashSet::new)
                .insert(id.clone());
        }
    }

    pub fn resolve(&self, id: &str) -> Option<Arc<dyn PipelineStage>> {
        self.stages.get(id).cloned()
    }

    pub fn resolve_by_capability(&self, capability: &str) -> Vec<Arc<dyn PipelineStage>> {
        let mut results = Vec::new();
        if let Some(ids) = self.capabilities.get(capability) {
            for id in ids {
                if let Some(stage) = self.stages.get(id) {
                    results.push(stage.clone());
                }
            }
        }
        results
    }
}
