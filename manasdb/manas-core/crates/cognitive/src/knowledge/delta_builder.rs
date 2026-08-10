use super::models::ResolvedKnowledge;
use graph::persistence::delta::GraphDelta;

pub trait GraphDeltaBuilder: Send + Sync {
    fn build_delta(&self, knowledge: ResolvedKnowledge) -> Result<GraphDelta, String>;
}
