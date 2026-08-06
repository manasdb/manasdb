use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Query {
    // Input
    pub text: Option<String>,
    pub embedding: Option<Vec<f32>>,
    // Options
    pub namespace: Option<Vec<String>>,
    // Execution constraints
    pub timeout: Option<Duration>,
    pub limit: usize,
    pub offset: usize,
    pub explain: bool,
}

impl Default for Query {
    fn default() -> Self {
        Self {
            text: None,
            embedding: None,
            namespace: None,
            timeout: None,
            limit: 10,
            offset: 0,
            explain: false,
        }
    }
}
