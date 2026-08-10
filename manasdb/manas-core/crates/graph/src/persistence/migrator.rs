pub trait GraphMigrator {
    /// Upgrades the storage schema to the latest version.
    fn migrate_up(&self) -> Result<(), String>;
    
    /// Downgrades the storage schema by one version.
    fn migrate_down(&self) -> Result<(), String>;
}
