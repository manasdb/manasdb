# Cargo Dependency Graph Policy

To ensure independent compilation and maintain architectural boundaries, the Cargo dependency graph strictly follows a directed acyclic graph (DAG). 

## Allowed Dependencies Hierarchy

Higher-level crates may depend on lower-level crates, but **never the reverse**.

1. **Runtime / Cognitive** (Highest Layer)
   - Depends on: `pipeline`, `search`, `storage-contracts`, `memory`, `tokenizer`, `vector`, `common`.
2. **Pipeline**
   - Depends on: `search`, `storage-contracts`, `memory`, `tokenizer`, `vector`, `common`.
3. **Search / Graph**
   - Depends on: `storage-contracts`, `memory`, `tokenizer`, `vector`, `common`.
4. **Storage Contracts**
   - Depends on: `memory`, `tokenizer`, `vector`, `common`.
5. **Memory / Tokenizer**
   - Depends on: `vector`, `common`.
6. **Vector**
   - Depends on: `common`.
7. **Common** (Lowest Layer)
   - Must not depend on any other internal crate.

Any violation of this hierarchy (e.g., circular dependencies) will cause the build to fail and is considered a critical architectural violation.
