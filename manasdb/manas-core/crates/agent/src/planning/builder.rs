use crate::planning::dag::{DependencyEdge, DependencyType, TaskGraph, TaskNode, TaskSchedulingMetadata};
use crate::planning::plan::ExecutionPlan;
use crate::scheduling::TaskReadiness;
use std::collections::HashMap;

pub struct GraphBuilder;

impl GraphBuilder {
    pub fn build(plan: ExecutionPlan) -> Result<TaskGraph, crate::planning::dag::DagError> {
        let mut graph = TaskGraph::new();

        // Add tasks
        for task in plan.tasks {
            let node = TaskNode {
                task,
                scheduling_metadata: TaskSchedulingMetadata {
                    readiness: TaskReadiness::Ready, // Initially assume ready, Scheduler adjusts
                    retry_count: 0,
                },
                runtime_metadata: HashMap::new(),
            };
            graph.add_task(node);
        }

        // Add edges
        for (from, to) in plan.ordering {
            let edge = DependencyEdge {
                from,
                to,
                dependency_type: DependencyType::FinishToStart,
                condition: None,
                metadata: HashMap::new(),
            };
            graph.add_dependency(edge)?;
        }

        Ok(graph)
    }
}
