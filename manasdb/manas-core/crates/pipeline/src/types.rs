#[derive(Debug, Clone)]
pub struct PipelineData {
    // A placeholder for the actual data payload.
    // In a real system, this might be an enum over various data types (Memory, Query, etc.)
    // or a typemap.
    pub payload_bytes: Vec<u8>,
}

impl PipelineData {
    pub fn empty() -> Self {
        Self {
            payload_bytes: Vec::new(),
        }
    }
}
