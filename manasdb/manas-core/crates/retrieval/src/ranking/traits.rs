pub trait Ranker: Send + Sync + 'static {
    // Stub for concrete rankers
    fn name(&self) -> &'static str;
}
