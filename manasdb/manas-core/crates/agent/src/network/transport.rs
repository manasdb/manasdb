use crate::coordination::assignment::TaskAssignment;
use crate::orchestrator::mission::ExecutionResult;
use async_trait::async_trait;

#[async_trait]
pub trait TransportService: Send + Sync {
    async fn send_assignment(&self, target_node: &str, assignment: &TaskAssignment) -> Result<ExecutionResult, String>;
}

pub struct HttpTransport {}

impl HttpTransport {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl TransportService for HttpTransport {
    async fn send_assignment(&self, _target_node: &str, _assignment: &TaskAssignment) -> Result<ExecutionResult, String> {
        Ok(ExecutionResult::default())
    }
}

pub struct GrpcTransport {}

impl GrpcTransport {
    pub fn new() -> Self {
        Self {}
    }
}

#[async_trait]
impl TransportService for GrpcTransport {
    async fn send_assignment(&self, _target_node: &str, _assignment: &TaskAssignment) -> Result<ExecutionResult, String> {
        Ok(ExecutionResult::default())
    }
}
