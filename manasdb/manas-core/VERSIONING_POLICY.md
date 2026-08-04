# Dependency and Versioning Policy

1. **Workspace Versioning**: All internal `manas-core` crates share the same version number defined in the root `Cargo.toml` workspace.
2. **External Dependencies**: External dependencies must be kept to an absolute minimum to reduce compilation time and binary bloat.
3. **Shared Dependencies**: All shared external dependencies must be declared in the `[workspace.dependencies]` block in the root `Cargo.toml` and inherited by crates using `workspace = true`.
4. **No Unstable Features**: Do not use nightly Rust features. The project must always compile on the stable channel.
