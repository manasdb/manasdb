#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EventPropagationPolicy {
    None,
    SummaryOnly,
    Lifecycle,
    Full,
}

impl Default for EventPropagationPolicy {
    fn default() -> Self {
        Self::SummaryOnly
    }
}
