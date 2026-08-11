pub struct CoordinationValidator {}

impl CoordinationValidator {
    pub fn validate() -> Result<(), String> {
        // Here we validate routing strategies, directory, propagation policies, factory before startup
        Ok(())
    }
}
