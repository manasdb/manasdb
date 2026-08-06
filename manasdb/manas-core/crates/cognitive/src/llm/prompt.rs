use crate::core::types::Stimulus;
use crate::context::WorkingContext;
use crate::providers::ChatMessage;

pub struct PromptBuilder;

impl PromptBuilder {
    pub fn build_observation_prompt(stimulus: &Stimulus, _context: &WorkingContext) -> Vec<ChatMessage> {
        let content = match stimulus {
            Stimulus::Text(text) => text.clone(),
            _ => "Unsupported stimulus".to_string(),
        };
        
        vec![
            ChatMessage {
                role: "system".to_string(),
                content: "You are an observation engine. Extract key observations from the input.".to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content,
            }
        ]
    }
    
    // Add other prompt builders for planning, interpreting, etc.
}
