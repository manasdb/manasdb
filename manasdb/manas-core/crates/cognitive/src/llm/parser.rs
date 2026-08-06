pub trait ResponseParser<T> {
    fn parse(&self, raw: &str) -> Result<T, String>;
}

// Simple fallback parser that just extracts JSON from markdown blocks
pub struct JsonParser;
impl<T: serde::de::DeserializeOwned> ResponseParser<T> for JsonParser {
    fn parse(&self, raw: &str) -> Result<T, String> {
        let content = if raw.contains("```json") {
            let start = raw.find("```json").unwrap() + 7;
            let end = raw.rfind("```").unwrap_or(raw.len());
            &raw[start..end]
        } else {
            raw
        };
        
        serde_json::from_str(content).map_err(|e| e.to_string())
    }
}
