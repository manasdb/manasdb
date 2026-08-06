#[derive(Debug, Clone, Default)]
pub struct RuntimeConfig {
    pub max_concurrent_executions: usize,
}

#[derive(Debug, Clone, Default)]
pub struct SchedulerConfig {
    pub max_tasks: usize,
}

#[derive(Debug, Clone, Default)]
pub struct StorageConfig {
    pub uri: String,
}

#[derive(Debug, Clone, Default)]
pub struct TelemetryConfig {
    pub enabled: bool,
}

#[derive(Debug, Clone, Default)]
pub struct FeatureFlags {
    pub enable_experimental_graph: bool,
}
