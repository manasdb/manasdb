# WASM Compatibility Guidelines

To ensure ManasDB's algorithms remain universally accessible, all crates within `manas-core` (unless explicitly designated as platform-bound) must compile to WebAssembly (`wasm32-unknown-unknown`).

## Rules
1. **No direct system I/O**: Do not use `std::fs` or `std::net`. Use traits that abstract these capabilities (provided by `storage-contracts`).
2. **Time and Randomness**: `std::time::SystemTime` and threaded random number generators often fail in strict WASM environments. Use WASM-compatible abstractions.
3. **No native threading**: Avoid `std::thread`. If concurrency is needed, it must be feature-flagged or abstracted away.
4. **FFI Boundaries**: Keep boundaries thin. The heavy lifting must reside in pure, logic-only crates.
5. **Continuous Integration**: Every PR must verify that `cargo build --target wasm32-unknown-unknown` succeeds for all core crates.
