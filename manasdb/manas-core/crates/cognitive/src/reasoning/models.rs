use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hypothesis {
    pub id: uuid::Uuid,
    pub statement: String,
    pub confidence_score: f32,
    pub source_facts: Vec<uuid::Uuid>,
}

impl Hypothesis {
    pub fn new(statement: impl Into<String>, confidence_score: f32, source_facts: Vec<uuid::Uuid>) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            statement: statement.into(),
            confidence_score,
            source_facts,
        }
    }
}
