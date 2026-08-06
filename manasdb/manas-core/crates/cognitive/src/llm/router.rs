use crate::core::traits::CapabilityId;
use crate::providers::{ProviderId, ModelId};

#[derive(Debug, Clone)]
pub struct Route {
    pub provider: ProviderId,
    pub model: ModelId,
}

pub struct Router {
    policies: std::collections::HashMap<CapabilityId, Vec<Route>>,
}

impl Router {
    pub fn new() -> Self {
        Self {
            policies: std::collections::HashMap::new(),
        }
    }
    
    pub fn set_policy(&mut self, capability: CapabilityId, routes: Vec<Route>) {
        self.policies.insert(capability, routes);
    }
    
    pub fn get_routes(&self, capability: &CapabilityId) -> Option<&Vec<Route>> {
        self.policies.get(capability)
    }
}
