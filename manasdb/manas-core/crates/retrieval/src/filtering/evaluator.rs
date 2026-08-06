use crate::filtering::ast::FilterExpression;

#[derive(Debug, Clone)]
pub struct SecurityFilter {
    pub expression: FilterExpression,
}

#[derive(Debug, Clone)]
pub struct PreFilter {
    pub expression: FilterExpression,
}

#[derive(Debug, Clone)]
pub struct PostFilter {
    pub expression: FilterExpression,
}

pub struct Evaluator;

impl Evaluator {
    // Basic stub for evaluation
}
