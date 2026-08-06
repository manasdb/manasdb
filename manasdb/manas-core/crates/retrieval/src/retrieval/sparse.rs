use crate::retrieval::traits::Retriever;

pub struct SparseRetriever;

impl Retriever for SparseRetriever {
    fn name(&self) -> &'static str {
        "SparseRetriever"
    }
}
