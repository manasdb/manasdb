use std::collections::HashMap;
use std::sync::Arc;
use crate::providers::{ProviderId, ChatProvider};

#[derive(Default)]
pub struct ProviderRegistry {
    chat_providers: HashMap<ProviderId, Arc<dyn ChatProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn register_chat(&mut self, provider: Arc<dyn ChatProvider>) {
        self.chat_providers.insert(provider.id(), provider);
    }
    
    pub fn get_chat(&self, id: &ProviderId) -> Option<Arc<dyn ChatProvider>> {
        self.chat_providers.get(id).cloned()
    }
}
