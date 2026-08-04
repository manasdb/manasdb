use crate::builders::MemoryFactory;
use crate::entities::MemoryContent;
use crate::serialization::JsonSerializer;

#[test]
fn test_memory_factory_creates_text_memory() {
    let text = "This is a test memory.";
    let memory = MemoryFactory::create_text_memory(text).unwrap();

    assert_eq!(memory.kind, crate::entities::MemoryKind::Document);
    assert_eq!(memory.source, crate::entities::MemorySource::API);
    assert_eq!(memory.origin, crate::entities::Origin::System);
    assert_eq!(memory.identity.namespace.parts(), &["default".to_string()]);

    if let MemoryContent::Text { content } = memory.content {
        assert_eq!(content, text);
    } else {
        panic!("Expected text content");
    }
}

#[test]
fn test_serialization() {
    let memory = MemoryFactory::create_text_memory("Test serialization").unwrap();
    
    let json = JsonSerializer::to_string(&memory).unwrap();
    let deserialized = JsonSerializer::from_string(&json).unwrap();
    
    assert_eq!(memory, deserialized);
}

#[test]
fn test_golden_memory() {
    use std::fs;
    use std::path::PathBuf;

    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("../../../manas-specification/v1/corpus/memory");
    let golden_path = path.join("expected_memory.json");

    let text = "This is a golden memory.";
    let memory = MemoryFactory::create_text_memory(text).unwrap();

    if !golden_path.exists() {
        fs::write(&golden_path, JsonSerializer::to_string_pretty(&memory).unwrap()).unwrap();
    }
    
    let expected_str = fs::read_to_string(&golden_path).unwrap();
    let _expected_memory = JsonSerializer::from_string(&expected_str).unwrap();
}
