use crate::execution::definition::PipelineDefinition;

pub struct PipelineBuilder {
    name: String,
    stage_ids: Vec<String>,
}

impl PipelineBuilder {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            stage_ids: Vec::new(),
        }
    }

    pub fn add_stage(mut self, stage_id: &str) -> Self {
        self.stage_ids.push(stage_id.to_string());
        self
    }

    pub fn build(self) -> PipelineDefinition {
        PipelineDefinition::new(&self.name, self.stage_ids)
    }
}
