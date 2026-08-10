use crate::ids::TaskId;
use crate::models::Task;
use crate::scheduling::TaskReadiness;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DependencyType {
    FinishToStart,
    StartToStart,
    FinishToFinish,
    StartToFinish,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DependencyEdge {
    pub from: TaskId,
    pub to: TaskId,
    pub dependency_type: DependencyType,
    pub condition: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskSchedulingMetadata {
    pub readiness: TaskReadiness,
    pub retry_count: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskNode {
    pub task: Task,
    pub scheduling_metadata: TaskSchedulingMetadata,
    pub runtime_metadata: HashMap<String, String>,
}

#[derive(Debug, Error)]
pub enum DagError {
    #[error("Cycle detected in TaskGraph")]
    CycleDetected,
    #[error("Task {0} not found")]
    TaskNotFound(TaskId),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskGraph {
    pub nodes: HashMap<TaskId, TaskNode>,
    pub edges: Vec<DependencyEdge>,
    adjacency_list: HashMap<TaskId, Vec<TaskId>>,
    incoming_edges: HashMap<TaskId, usize>,
}

impl TaskGraph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
            edges: Vec::new(),
            adjacency_list: HashMap::new(),
            incoming_edges: HashMap::new(),
        }
    }

    pub fn add_task(&mut self, node: TaskNode) {
        let id = node.task.id;
        self.nodes.insert(id, node);
        self.adjacency_list.entry(id).or_insert_with(Vec::new);
        self.incoming_edges.entry(id).or_insert(0);
    }

    pub fn add_dependency(&mut self, edge: DependencyEdge) -> Result<(), DagError> {
        if !self.nodes.contains_key(&edge.from) {
            return Err(DagError::TaskNotFound(edge.from));
        }
        if !self.nodes.contains_key(&edge.to) {
            return Err(DagError::TaskNotFound(edge.to));
        }

        self.adjacency_list
            .entry(edge.from)
            .or_insert_with(Vec::new)
            .push(edge.to);
        *self.incoming_edges.entry(edge.to).or_insert(0) += 1;
        self.edges.push(edge.clone());

        if self.has_cycle() {
            // Rollback
            self.adjacency_list.get_mut(&edge.from).unwrap().pop();
            *self.incoming_edges.get_mut(&edge.to).unwrap() -= 1;
            self.edges.pop();
            return Err(DagError::CycleDetected);
        }

        Ok(())
    }

    pub fn remove_task(&mut self, id: TaskId) {
        if self.nodes.remove(&id).is_none() {
            return;
        }
        if let Some(children) = self.adjacency_list.remove(&id) {
            for child in children {
                if let Some(count) = self.incoming_edges.get_mut(&child) {
                    *count = count.saturating_sub(1);
                }
            }
        }
        self.edges.retain(|e| e.from != id && e.to != id);
        for targets in self.adjacency_list.values_mut() {
            targets.retain(|t| *t != id);
        }
        self.incoming_edges.remove(&id);
    }

    pub fn topological_sort(&self) -> Result<Vec<TaskId>, DagError> {
        let mut in_degree = self.incoming_edges.clone();
        let mut queue: Vec<TaskId> = in_degree
            .iter()
            .filter(|&(_, &count)| count == 0)
            .map(|(id, _)| *id)
            .collect();

        let mut sorted = Vec::new();

        while let Some(current) = queue.pop() {
            sorted.push(current);
            if let Some(neighbors) = self.adjacency_list.get(&current) {
                for neighbor in neighbors {
                    if let Some(count) = in_degree.get_mut(neighbor) {
                        *count -= 1;
                        if *count == 0 {
                            queue.push(*neighbor);
                        }
                    }
                }
            }
        }

        if sorted.len() != self.nodes.len() {
            return Err(DagError::CycleDetected);
        }

        Ok(sorted)
    }

    pub fn get_unblocked_tasks(&self) -> Vec<TaskId> {
        self.incoming_edges
            .iter()
            .filter(|&(_, &count)| count == 0)
            .map(|(id, _)| *id)
            .collect()
    }

    pub(crate) fn has_cycle(&self) -> bool {
        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        for node_id in self.nodes.keys() {
            if self.has_cycle_util(*node_id, &mut visited, &mut rec_stack) {
                return true;
            }
        }
        false
    }

    fn has_cycle_util(
        &self,
        node: TaskId,
        visited: &mut HashSet<TaskId>,
        rec_stack: &mut HashSet<TaskId>,
    ) -> bool {
        if !visited.contains(&node) {
            visited.insert(node);
            rec_stack.insert(node);

            if let Some(neighbors) = self.adjacency_list.get(&node) {
                for neighbor in neighbors {
                    if !visited.contains(neighbor)
                        && self.has_cycle_util(*neighbor, visited, rec_stack)
                    {
                        return true;
                    } else if rec_stack.contains(neighbor) {
                        return true;
                    }
                }
            }
        }
        rec_stack.remove(&node);
        false
    }
}
