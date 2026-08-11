use crate::ids::AgentId;
use std::collections::HashMap;
use crate::cluster::validator::ProductionRuntimeValidator;

#[derive(Debug, Clone, Default)]
pub struct ClusterContext {
    pub routing_table: HashMap<String, String>,
    pub replication_status: HashMap<AgentId, String>,
}

impl ClusterContext {
    pub fn new() -> Self {
        Self::default()
    }
}

use crate::network::runtime::NetworkRuntime;
use crate::telemetry::runtime::TelemetryRuntime;
use crate::persistence::runtime::PersistenceRuntime;

#[allow(dead_code)]
pub struct ClusterRuntime {
    network_runtime: NetworkRuntime,
    telemetry_runtime: TelemetryRuntime,
    persistence_runtime: PersistenceRuntime,
}

impl ClusterRuntime {
    pub fn new() -> Self {
        Self {
            network_runtime: NetworkRuntime::new(),
            telemetry_runtime: TelemetryRuntime::new(),
            persistence_runtime: PersistenceRuntime::new(),
        }
    }

    pub fn start(&self) -> Result<(), String> {
        ProductionRuntimeValidator::validate()?;
        Ok(())
    }
}
