use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Evidence {
    pub source_id: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fact {
    pub id: uuid::Uuid,
    pub statement: String,
    pub evidence: Vec<Evidence>,
}

impl Fact {
    pub fn new(statement: impl Into<String>, evidence: Vec<Evidence>) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            statement: statement.into(),
            evidence,
        }
    }
}
