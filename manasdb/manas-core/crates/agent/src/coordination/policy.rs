#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DelegationPolicy {
    AlwaysLocal,
    PreferLocal,
    PreferRemote,
    CapabilityOnly,
    Broadcast,
    Custom(String),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DelegationFailurePolicy {
    RetryLocal,
    RetryRemote,
    Escalate,
    AbortMission,
    Ignore,
}
