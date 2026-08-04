# API Compatibility Policy

1. **No Breaking Changes from Rust**: The migration to the Rust core (`manas-core`) is an internal execution change. It must **never** break the public API of the existing SDKs (Node.js, etc.).
2. **SDK Idioms**: Language SDKs must maintain their native idioms. Promises in Node.js, Goroutines in Go, etc.
3. **API Contracts**: All SDKs must expose identical domain concepts (`absorb()`, `recall()`, `update()`, etc.).
4. **Behavioral Compatibility**: Golden tests and Conformance tests must guarantee that identical inputs yield identical outputs (and side effects) across all environments.
