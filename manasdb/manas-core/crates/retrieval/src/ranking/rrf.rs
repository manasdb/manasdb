use crate::ranking::traits::Ranker;

pub struct RRFRanker;

impl Ranker for RRFRanker {
    fn name(&self) -> &'static str {
        "RRFRanker"
    }
}
