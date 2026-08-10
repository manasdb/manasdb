use super::transaction::GraphTransaction;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BackendCapabilities {
    pub transactions: bool,
    pub lazy_loading: bool,
    pub streaming: bool,
    pub snapshots: bool,
    pub schema_migrations: bool,
}

pub trait GraphRepository: Send + Sync {
    fn capabilities(&self) -> BackendCapabilities;
    
    // In a real implementation, these would return domain structures.
    // For now, the repository exposes transactions and loaders.
    
    fn begin_transaction(&self) -> Result<Box<dyn GraphTransaction>, String>;
}
