use serde::{Deserialize, Serialize};
use std::fmt;

/// Represents a hierarchical namespace (e.g., organization/workspace/project/collection).
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct NamespacePath {
    parts: Vec<String>,
}

impl NamespacePath {
    pub fn new(parts: Vec<String>) -> Self {
        Self { parts }
    }

    pub fn parts(&self) -> &[String] {
        &self.parts
    }

    pub fn as_string(&self) -> String {
        self.parts.join("/")
    }
}

impl Default for NamespacePath {
    fn default() -> Self {
        Self {
            parts: vec!["default".to_string()],
        }
    }
}

impl fmt::Display for NamespacePath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_string())
    }
}
