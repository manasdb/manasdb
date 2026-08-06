use crate::retrieval::traits::Retriever;

pub struct DenseRetriever;

impl Retriever for DenseRetriever {
    fn name(&self) -> &'static str {
        "DenseRetriever"
    }
}
