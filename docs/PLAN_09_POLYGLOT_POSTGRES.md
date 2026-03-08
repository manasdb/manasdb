# Plan 09: Polyglot Persistence & PostgreSQL (`pgvector`)

This document details the architectural evolution of ManasDB from a MongoDB-exclusive vector abstraction layer into a **Polyglot Universal Memory Architecture**.

## 1. The Core Objective

As ManasDB scaled, tying its semantic recall abilities exclusively to MongoDB Atlas Vector Search became a bottleneck for users operating on traditional relational stacks or offline environments (where local databases are preferred).

The goal for **Plan 09** was to detangle the Storage Engine from the LLM Embedding Engine, allowing ManasDB to:

1. Accept an array of completely different database drivers.
2. Natively broadcast semantic insertions (`absorb`) across all databases in parallel.
3. Automatically merge, map, and rank vector search operations (`recall`) retrieved from disparate environments simultaneously.

## 2. Introducing the `BaseProvider` Concept

We segregated the Storage Layer under `src/providers/` (distinct from `src/core/providers/` which handles LLM Model APIs like Gemini or Ollama).

Every Storage mechanism (like `MongoProvider` and `PostgresProvider`) extends the `BaseProvider` class, promising a strict interface:

- **`init()`**: Table schema generation or connection validating.
- **`insert(context)`**: Ingesting chunked tokens and managing deduplication mappings.
- **`vectorSearch(query)`**: Providing top-K cosine similarities mapping vector embeddings back to parent metadata.
- **`health()`**: Connection validation.

## 3. The PostgreSQL Driver Architecture

We integrated `pg` natively to act as our relational vector storage, utilizing the `pgvector` extension.

### 3.1 Schema Design

To provide a universally predictable architecture, PostgreSQL generates relational tables identically mirroring MongoDB's structure:

- **`_manas_documents`**: Parent document registry (metadata + content hash)
- **`_manas_chunks`**: Token-aware text chunks with section titles and tags
- **`_manas_vectors`**: Embeddings vector table containing isolated cross-project embeddings mapped to chunks
- **`_manas_telemetry`**: Operation event log (cost, latency, deduplication events)

### 3.2 Context Healing via `<=>`

In MongoDB, we used a heavy Aggregation Pipeline (`$vectorSearch` mapped to `$lookup`) to retrieve full document contexts. In PostgreSQL, this is achieved natively through an extremely fast `JOIN` across the relational tables:

```sql
SELECT
  v.id as vector_id,
  c.text as chunk_text,
  c.section_title as section_title,
  p.id as parent_id,
  p.tags,
  (1 - (v.vec <=> $1::vector)) as score
FROM _manas_vectors v
JOIN _manas_chunks c ON v.chunk_id = c.id
JOIN _manas_documents p ON c.document_id = p.id
WHERE v.project = $2
  AND v.model = $3
  AND (1 - (v.vec <=> $1::vector)) >= $4
ORDER BY v.vec <=> $1::vector ASC
LIMIT $5;
```

By subtracting the `<=>` distance from `1`, ManasDB normalizes the scoring metric to the standard `0.0 - 1.0` cosine similarity output universally expected by the core RRF fusion engine.

### 3.3 ROI Cross-Project Deduplication

To preserve LLM embedding costs across multiple project namespaces without triggering `UNIQUE` constraint deadlocks, the Postgres Provider detects existing `embedding_hash` collisions system-wide. Instead of re-embedding the text via the LLM API, it natively copies the `vec::text` output into an isolated row for the new project.

## 4. The Orchestrator Setup

To utilize the Polyglot orchestrator, developers declare an array of `databases`:

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  databases: [
    { type: "mongodb", uri: process.env.MONGODB_URI },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  projectName: "agent_memory",
  modelConfig: { source: "transformers" },
});
```

Because results are universally formatted by their Providers, `ManasDB` gracefully sorts, filters, and merges the deduplicated exact vectors back into a cohesive, system-agnostic search payload!

### 4.1 Single-Database Auto-Discovery

If a developer only needs a single database (e.g. only PostgreSQL or only MongoDB), they can bypass the `databases` array and supply a single `uri` at the root configuration level. The orchestrator will dynamically mount the correct Provider based on the connection prefix (`mongodb://` or `postgres://`):

```javascript
const memory = new ManasDB({
  uri: process.env.POSTGRES_URI, // Auto-discovers PostgreSQL provider
  projectName: "agent_memory",
  modelConfig: { source: "transformers" },
});
```
