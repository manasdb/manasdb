use crate::ranking::traits::Ranker;

pub struct BM25Ranker;

impl Ranker for BM25Ranker {
    fn name(&self) -> &'static str {
        "BM25Ranker"
    }
}
