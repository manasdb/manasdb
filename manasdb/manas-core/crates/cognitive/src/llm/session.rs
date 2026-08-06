pub struct ProviderSession {
    pub conversation_id: String,
    pub total_tokens_in: u32,
    pub total_tokens_out: u32,
}

impl ProviderSession {
    pub fn new(conversation_id: String) -> Self {
        Self {
            conversation_id,
            total_tokens_in: 0,
            total_tokens_out: 0,
        }
    }
}
