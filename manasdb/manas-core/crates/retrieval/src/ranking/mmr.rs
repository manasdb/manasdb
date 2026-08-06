use crate::ranking::traits::Ranker;

pub struct MMRRanker;

impl Ranker for MMRRanker {
    fn name(&self) -> &'static str {
        "MMRRanker"
    }
}
