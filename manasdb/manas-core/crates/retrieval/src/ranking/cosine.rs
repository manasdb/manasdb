use crate::ranking::traits::Ranker;

pub struct CosineRanker;

impl Ranker for CosineRanker {
    fn name(&self) -> &'static str {
        "CosineRanker"
    }
}
