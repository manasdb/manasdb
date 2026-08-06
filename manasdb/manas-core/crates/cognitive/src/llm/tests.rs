use std::sync::Arc;
use crate::core::traits::CapabilityId;
use crate::llm::{LlmService, ProviderRegistry, Router, Route, PromptBuilder};
use crate::llm::cache::NoOpCache;
use crate::providers::mock::MockProvider;
use crate::providers::{ProviderId, ModelId, ChatMessage};

#[tokio::test]
async fn test_router_fallback() {
    let mut registry = ProviderRegistry::new();
    
    // Register primary provider (fails)
    registry.register_chat(Arc::new(MockProvider::new("primary", true)));
    // Register secondary provider (succeeds)
    registry.register_chat(Arc::new(MockProvider::new("secondary", false)));
    
    let mut router = Router::new();
    router.set_policy(
        CapabilityId::Observe, 
        vec![
            Route { provider: ProviderId("primary".to_string()), model: ModelId("model-a".to_string()) },
            Route { provider: ProviderId("secondary".to_string()), model: ModelId("model-b".to_string()) },
        ]
    );
    
    let llm_service = LlmService::new(
        Arc::new(registry),
        Arc::new(router),
        Arc::new(NoOpCache),
    );
    
    let messages = vec![ChatMessage { role: "user".to_string(), content: "test".to_string() }];
    
    let result = llm_service.execute_chat(CapabilityId::Observe, messages).await;
    
    assert!(result.is_ok());
    let (response, metadata) = result.unwrap();
    
    // Should have fallen back to secondary
    assert_eq!(metadata.provider, "secondary");
    assert_eq!(response.content, "Mock response to: test");
}

#[tokio::test]
async fn test_prompt_builder_determinism() {
    let stimulus = crate::core::types::Stimulus::Text("Sample input".to_string());
    let ctx = crate::context::WorkingContext::default();
    
    let prompt1 = PromptBuilder::build_observation_prompt(&stimulus, &ctx);
    let prompt2 = PromptBuilder::build_observation_prompt(&stimulus, &ctx);
    
    assert_eq!(prompt1.len(), prompt2.len());
    for i in 0..prompt1.len() {
        assert_eq!(prompt1[i].role, prompt2[i].role);
        assert_eq!(prompt1[i].content, prompt2[i].content);
    }
}

use crate::llm::parser::{ResponseParser, JsonParser};
use serde::Deserialize;

#[derive(Deserialize, PartialEq, Debug)]
struct TestModel {
    id: String,
    value: i32,
}

#[test]
fn test_parser_normalization() {
    let parser = JsonParser;
    
    // Plain JSON
    let plain_json = r#"{"id": "test1", "value": 42}"#;
    let res1: TestModel = parser.parse(plain_json).unwrap();
    
    // Markdown JSON
    let markdown_json = r#"Here is your response:
```json
{"id": "test1", "value": 42}
```"#;
    let res2: TestModel = parser.parse(markdown_json).unwrap();
    
    assert_eq!(res1, res2);
}
