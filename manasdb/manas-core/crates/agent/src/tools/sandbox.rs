use crate::models::AgentContext;
use std::time::Duration;
use thiserror::Error;
use std::sync::mpsc;
use std::thread;

#[derive(Debug, Error)]
pub enum SandboxError {
    #[error("Tool execution timed out")]
    Timeout,
    #[error("Tool execution failed: {0}")]
    ExecutionFailed(String),
}

pub struct Sandbox;

impl Sandbox {
    pub fn execute_with_timeout<F, R>(
        timeout: Duration,
        _context: &AgentContext,
        f: F,
    ) -> Result<R, SandboxError>
    where
        F: FnOnce() -> R + Send + 'static,
        R: Send + 'static,
    {
        // Simple thread-based timeout for Phase 10C testing.
        // In async Rust, this would be tokio::time::timeout.
        let (tx, rx) = mpsc::channel();
        
        thread::spawn(move || {
            let result = f();
            let _ = tx.send(result);
        });

        match rx.recv_timeout(timeout) {
            Ok(result) => Ok(result),
            Err(mpsc::RecvTimeoutError::Timeout) => Err(SandboxError::Timeout),
            Err(mpsc::RecvTimeoutError::Disconnected) => Err(SandboxError::ExecutionFailed("Thread disconnected".to_string())),
        }
    }
}
