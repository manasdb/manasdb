use super::delta::GraphDelta;

pub trait GraphTransaction: Send + Sync {
    /// Applies a delta to the transaction's staging area.
    fn apply(&mut self, delta: GraphDelta) -> Result<(), String>;
    
    /// Commits the transaction to the underlying backend.
    fn commit(self: Box<Self>) -> Result<(), String>;
    
    /// Rolls back the transaction, discarding any applied deltas.
    fn rollback(self: Box<Self>) -> Result<(), String>;
}
