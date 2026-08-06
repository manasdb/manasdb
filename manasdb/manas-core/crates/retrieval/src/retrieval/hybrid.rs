use crate::retrieval::traits::Retriever;

pub struct HybridRetriever;

impl Retriever for HybridRetriever {
    fn name(&self) -> &'static str {
        "HybridRetriever"
    }
}
