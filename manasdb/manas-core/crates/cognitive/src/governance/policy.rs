use crate::governance::constraints::Constraint;

pub struct Policy {
    pub name: String,
    pub constraints: Vec<Constraint>,
}
