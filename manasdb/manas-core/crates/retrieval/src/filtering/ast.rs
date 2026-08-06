#[derive(Debug, Clone)]
pub enum Operator {
    Eq,
    Neq,
    Gt,
    Lt,
    In,
    Contains,
    And,
    Or,
    Not,
}

#[derive(Debug, Clone)]
pub struct FilterExpression {
    pub operator: Operator,
    pub field: Option<String>,
    pub value: Option<String>,
    pub children: Vec<FilterExpression>,
}
