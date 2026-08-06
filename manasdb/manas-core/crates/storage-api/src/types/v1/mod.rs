#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum StorageCapability {
    Batch,
    Transactions,
    Vectors,
    Graph,
    Blob,
    Streaming,
    Filtering,
    Namespaces,
    Versioning,
    TTL,
    Snapshots,
    Encryption,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    ReadOnly,
    Disconnected,
}

#[derive(Debug, Clone, Default)]
pub struct BatchResult {
    pub inserted: usize,
    pub updated: usize,
    pub deleted: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TransactionId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct SchemaVersion(pub String);
