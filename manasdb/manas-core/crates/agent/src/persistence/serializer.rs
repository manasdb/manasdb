pub struct SnapshotSerializer {}

impl SnapshotSerializer {
    pub fn serialize<T>(_data: &T) -> Result<Vec<u8>, String> {
        Ok(Vec::new())
    }

    pub fn deserialize<T>(_bytes: &[u8]) -> Result<T, String> {
        Err("Stub".to_string())
    }
}
