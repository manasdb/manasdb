# Storage Schemas

_Moved from README.md._


ManasDB automatically migrates and configures schemas. Both **MongoDB** and **PostgreSQL** use **identical naming conventions**, making it easy to reason about data across providers:

### MongoDB Collections & PostgreSQL Tables

| Name               | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `_manas_documents` | Parent document registry (metadata + content hash)                                  |
| `_manas_chunks`    | Token-aware text chunks with section titles and tags                                |
| `_manas_vectors`   | Embeddings — stores both `vector` (compressed ANN) and `vector_full` (exact rerank) |
| `_manas_telemetry` | Operation event log (cost, latency, deduplication events)                           |

> Both MongoDB and PostgreSQL use the same four table/collection names for full schema parity.

---

