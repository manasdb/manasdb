use cognitive::llm::parser::{JsonParser, ResponseParser};
use cognitive::planning::Plan;

#[test]
fn test_provider_conformance_parser() {
    let parser = JsonParser;
    
    // Test that the parser can normalize JSON from any hypothetical provider
    let mock_json = r#"{
        "id": "00000000-0000-0000-0000-000000000000",
        "goal_id": "00000000-0000-0000-0000-000000000001",
        "actions": []
    }"#;
    
    let plan: Plan = parser.parse(mock_json).unwrap();
    assert_eq!(plan.id.to_string(), "00000000-0000-0000-0000-000000000000");
    assert_eq!(plan.goal_id.to_string(), "00000000-0000-0000-0000-000000000001");
}
