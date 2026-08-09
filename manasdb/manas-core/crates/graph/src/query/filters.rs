use crate::domain::GraphProperty;
use crate::types::{NodeKind, RelationshipKind};

#[derive(Debug, Clone)]
pub enum PropertyFilter {
    Eq(String, GraphProperty),
    Exists(String),
}

#[derive(Debug, Clone)]
pub enum NodeFilter {
    ByKind(NodeKind),
    ByProperty(PropertyFilter),
}

#[derive(Debug, Clone)]
pub enum EdgeFilter {
    ByKind(RelationshipKind),
    ByProperty(PropertyFilter),
}

#[derive(Debug, Clone)]
pub enum TemporalFilter {
    Before(chrono::DateTime<chrono::Utc>),
    After(chrono::DateTime<chrono::Utc>),
    Between(chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>),
}
