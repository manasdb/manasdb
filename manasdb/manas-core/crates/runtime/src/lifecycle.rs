#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RuntimeState {
    Uninitialized,
    Initialized,
    Starting,
    Ready,
    Running,
    Stopping,
    Shutdown,
}

impl Default for RuntimeState {
    fn default() -> Self {
        Self::Uninitialized
    }
}
