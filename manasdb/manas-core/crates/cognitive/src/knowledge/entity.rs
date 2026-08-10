use crate::interpret::Fact;

#[derive(Debug, Clone)]
pub struct IdentifiedEntity {
    pub fact: Fact,
    pub business_keys: Vec<String>,
}

pub trait EntityResolver: Send + Sync {
    fn resolve(&self, fact: &Fact) -> Result<IdentifiedEntity, String>;
}
