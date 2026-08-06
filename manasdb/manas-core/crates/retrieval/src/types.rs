use std::marker::PhantomData;
use memory::ids::MemoryId;
use crate::query::optimizer::ExecutionGraph;
use crate::explain::explanation::{Explanation, ExecutionStatistics};

// Type states
#[derive(Debug, Clone)]
pub struct Retrieved;
#[derive(Debug, Clone)]
pub struct Filtered;
#[derive(Debug, Clone)]
pub struct Ranked;
#[derive(Debug, Clone)]
pub struct Fused;
#[derive(Debug, Clone)]
pub struct Explained;

/// A candidate document/memory retrieved during the retrieval process.
/// The state parameter allows compile-time enforcement of the retrieval pipeline stages.
#[derive(Debug, Clone)]
pub struct Candidate<State> {
    /// The memory ID of the retrieved document
    pub memory_id: MemoryId,
    /// The score of the candidate (meaning depends on the state)
    pub score: f32, // Default 0.0 or semantic score
    _state: PhantomData<State>,
}

impl Candidate<Retrieved> {
    pub fn new(memory_id: MemoryId, score: f32) -> Self {
        Self {
            memory_id,
            score,
            _state: PhantomData,
        }
    }
    
    pub fn into_filtered(self) -> Candidate<Filtered> {
        Candidate {
            memory_id: self.memory_id,
            score: self.score,
            _state: PhantomData,
        }
    }
}

impl Candidate<Filtered> {
    pub fn into_ranked(self, score: f32) -> Candidate<Ranked> {
        Candidate {
            memory_id: self.memory_id,
            score,
            _state: PhantomData,
        }
    }
}

impl Candidate<Ranked> {
    pub fn into_fused(self, score: f32) -> Candidate<Fused> {
        Candidate {
            memory_id: self.memory_id,
            score,
            _state: PhantomData,
        }
    }
}

impl Candidate<Fused> {
    pub fn into_explained(self) -> Candidate<Explained> {
        Candidate {
            memory_id: self.memory_id,
            score: self.score,
            _state: PhantomData,
        }
    }
}

#[derive(Debug, Clone)]
pub struct RetrievalResult {
    pub candidates: Vec<Candidate<Explained>>,
    pub explanation: Explanation,
    pub statistics: ExecutionStatistics,
    pub execution_graph: ExecutionGraph,
    pub warnings: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_candidate_state_transitions() {
        let memory_id = MemoryId::new("test-memory-id");
        let candidate = Candidate::<Retrieved>::new(memory_id.clone(), 0.8);
        assert_eq!(candidate.score, 0.8);
        assert_eq!(candidate.memory_id, memory_id);

        let filtered = candidate.into_filtered();
        assert_eq!(filtered.score, 0.8);

        let ranked = filtered.into_ranked(0.9);
        assert_eq!(ranked.score, 0.9);

        let fused = ranked.into_fused(0.95);
        assert_eq!(fused.score, 0.95);

        let explained = fused.into_explained();
        assert_eq!(explained.score, 0.95);
    }
}
