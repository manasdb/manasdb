# ADR 0001: Multi-language Platform Architecture

**Status**: Accepted  
**Date**: 2026-08-04  

## Context
ManasDB is transitioning from a Node.js-only library into a multi-language platform (Node, Python, Go, Java, WASM).

## Decision
1. **Rust Core Engine (`manas-core`)**: All algorithms and execution logic will be extracted into isolated Rust crates.
2. **Stable Public API**: Language-specific SDKs will maintain a 100% stable API. Users interact with the SDK idioms they know; the Rust core handles the execution under the hood via FFI/Bindings.
3. **Specification Driven**: `manas-specification` serves as the executable source of truth for behavior and conformance testing.
4. **WASM Compatibility**: Core algorithm crates must remain WASM-compatible (platform-independent) unless specifically marked as runtime-bound.

## Consequences
- Requires a phased migration to prevent breaking changes in the Node.js SDK.
- Introduces `manas-bindings` for language FFI (e.g., `napi-rs` for Node).
- Imposes strict conformance and golden tests across all supported languages.
