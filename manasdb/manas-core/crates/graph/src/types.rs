use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum NodeKind {
    Person,
    Place,
    Organization,
    Event,
    Concept,
    Document,
    Memory,
    Custom(String),
}

impl Default for NodeKind {
    fn default() -> Self {
        Self::Concept
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RelationshipKind {
    Knows,
    References,
    DerivedFrom,
    Causes,
    Contains,
    Supports,
    Contradicts,
    Custom(String),
}

impl Default for RelationshipKind {
    fn default() -> Self {
        Self::References
    }
}
