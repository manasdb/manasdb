use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct PipelineDefinition {
    pub id: String,
    pub name: String,
    pub stage_ids: Vec<String>, // Defines the logical order of stages
}

impl PipelineDefinition {
    pub fn new(name: &str, stage_ids: Vec<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            stage_ids,
        }
    }
}
