use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintViolation {
    pub id: uuid::Uuid,
    pub constraint_name: String,
    pub limit: f64,
    pub actual: f64,
}

impl ConstraintViolation {
    pub fn new(constraint_name: impl Into<String>, limit: f64, actual: f64) -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            constraint_name: constraint_name.into(),
            limit,
            actual,
        }
    }
}
