#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReplicationStrategy {
    Single,
    PrimaryReplica,
    Broadcast,
    Consensus,
}

impl Default for ReplicationStrategy {
    fn default() -> Self {
        Self::Single
    }
}
