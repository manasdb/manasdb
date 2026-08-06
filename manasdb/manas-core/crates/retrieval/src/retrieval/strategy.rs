#[derive(Debug, Clone, Default)]
pub struct RetrievalStrategy {
    pub candidate_sources: Vec<String>,
    pub filters: Vec<String>,
    pub rankers: Vec<String>,
    pub fusion: Option<String>,
}
