use std::collections::HashMap;
use std::sync::Arc;
use crate::retrieval::traits::Retriever;

#[derive(Default, Clone)]
pub struct RetrieverRegistry {
    retrievers: HashMap<String, Arc<dyn Retriever>>,
}

impl RetrieverRegistry {
    pub fn new() -> Self {
        Self {
            retrievers: HashMap::new(),
        }
    }

    pub fn register(&mut self, name: &str, retriever: Arc<dyn Retriever>) {
        self.retrievers.insert(name.to_string(), retriever);
    }

    pub fn get(&self, name: &str) -> Option<Arc<dyn Retriever>> {
        self.retrievers.get(name).cloned()
    }
}
