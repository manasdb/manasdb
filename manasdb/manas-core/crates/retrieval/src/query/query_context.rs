#[derive(Debug, Clone, Default)]
pub struct QueryContext {
    pub tenant: Option<String>,
    pub permissions: Vec<String>,
    pub locale: Option<String>,
    pub model: Option<String>,
    pub scope: Option<String>,
    pub request_id: Option<String>,
    pub trace_id: Option<String>,
    pub user_id: Option<String>,
    pub session_id: Option<String>,
}
