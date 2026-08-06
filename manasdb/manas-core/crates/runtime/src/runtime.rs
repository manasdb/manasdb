use crate::config::RuntimeConfig;
use crate::errors::RuntimeError;
use crate::execution_manager::ExecutionManager;
use crate::lifecycle::RuntimeState;
use crate::scheduler::TaskQueue;
use crate::types::ExecutionResult;
use pipeline::execution::Execution;
use pipeline::stage::StageRegistry;
use std::sync::Arc;

pub struct ManasRuntime {
    pub config: RuntimeConfig,
    pub state: RuntimeState,
    pub registry: Arc<StageRegistry>,
    pub execution_manager: ExecutionManager,
    pub scheduler: TaskQueue,
}

impl ManasRuntime {
    pub fn new(config: RuntimeConfig, registry: Arc<StageRegistry>) -> Self {
        let execution_manager = ExecutionManager::new(registry.clone());
        Self {
            config,
            state: RuntimeState::Uninitialized,
            registry,
            execution_manager,
            scheduler: TaskQueue::new(),
        }
    }

    pub fn initialize(&mut self) {
        self.state = RuntimeState::Initialized;
    }

    pub fn start(&mut self) {
        self.state = RuntimeState::Starting;
        // Mock startup logic
        self.state = RuntimeState::Ready;
    }

    pub async fn execute(&self, execution: Execution) -> Result<ExecutionResult, RuntimeError> {
        if self.state != RuntimeState::Ready && self.state != RuntimeState::Running {
            return Err(RuntimeError::LifecycleError("Runtime is not ready to execute pipelines".to_string()));
        }

        self.execution_manager.run(execution).await
    }

    pub fn shutdown(&mut self) {
        self.state = RuntimeState::Stopping;
        // Mock shutdown logic
        self.state = RuntimeState::Shutdown;
    }
}
