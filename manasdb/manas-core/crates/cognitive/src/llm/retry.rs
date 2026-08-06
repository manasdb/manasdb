use crate::providers::ChatResponse;
use std::future::Future;

pub struct RetryPolicy {
    pub max_retries: u32,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self { max_retries: 3 }
    }
}

pub async fn with_retry<F, Fut>(policy: &RetryPolicy, mut action: F) -> Result<ChatResponse, String>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<ChatResponse, String>>,
{
    let mut last_error = String::new();
    
    for _ in 0..=policy.max_retries {
        match action().await {
            Ok(response) => return Ok(response),
            Err(e) => {
                last_error = e;
                // Add simple backoff here in future
            }
        }
    }
    
    Err(format!("Max retries exceeded. Last error: {}", last_error))
}
