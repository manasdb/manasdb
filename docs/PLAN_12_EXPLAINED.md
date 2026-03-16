# PLAN 12: Compliance Erasure & Diverse Retrieval (MMR)

## 1. Context & Motivation

As ManasDB matured into a production-grade polyglot vector database, two critical missing pieces were addressed in v0.4.1:

1. **GDPR / Compliance Erasure**: Deleting data in a vector database is complex because embeddings, chunks, and metadata are often fragmented across multiple tables/collections. Deleting by a single ID is insufficient for "Right to be Forgotten" requests where all data belonging to a `userId` must be erased.
2. **Result Variety (MMR)**: Semantic search often returns highly redundant results (e.g., three chunks that all say "The apple is red" in different ways). This "semantic redundancy" wastes LLM context windows and degrades response quality.

---

## 2. Core Architecture: Compliance Erasure

We introduced a dual-purpose deletion API designed for both granular and bulk operations.

### `forget(documentId)`
- **Alias:** To maintain semantic alignment with AI terminology ("forgetting"), `forget` is an alias for `delete`.
- **Granularity:** Targeted at the `documentId` level.
- **Cascade:** Automatically triggers deletions across `_manas_documents`, `_manas_chunks`, and `_manas_vectors`.

### `forgetMany(query)`
- **Motivation:** Allows developers to wipe all data matching specific metadata tags (e.g., `{ userId: '123' }`).
- **Polyglot Fan-out:** In Polyglot mode, the request is broadcast to all active providers (MongoDB, PostgreSQL).
- **Audit Response:** Returns a detailed audit object containing:
  - `query`: The criteria used for deletion.
  - `deletedTotal`: Aggregate count across all providers.
  - `providers`: Breakdown of individual provider performance.
  - `timestamp`: ISO-8601 audit mark.

```json
{
  "query": { "userId": "123" },
  "deletedTotal": 8,
  "providers": [
    { "provider": "mongo", "deleted": 3 },
    { "provider": "postgres", "deleted": 5 }
  ],
  "timestamp": "2026-03-17T10:23:00.000Z"
}
```

---

## 3. Diverse Retrieval: Maximal Marginal Relevance (MMR)

Standard vector search (ANN) strictly optimizes for **Relevance** (Similarity to query). MMR optimizes for **Diversity** by penalizing candidates that are too similar to results already selected for the top list.

### Theoretical Logic
The MMR score is calculated iteratively:
`MMR = argmax_{D \in R\S} [λ · Sim(Q, D) - (1-λ) · max_{D' \in S} Sim(D, D')]`
- **Relevance:** `λ · Sim(Q, D)`
- **Diversity Penalty:** `(1-λ) · max Sim(D, D')` (How similar is this candidate to what we already picked?)

### Implementation Highlights
1. **CosSim Divergence**: Unlike naive tag-based Jaccard similarity, ManasDB uses true **Vector Cosine Similarity** between embeddings to calculate diversity.
2. **Conditional Projection**: Vector embeddings are heavy (384-1536 floats). ManasDB intelligently avoids fetching vectors from the DB unless `lambda < 1.0`, ensuring standard search remains light and fast.

---

## 4. Design Decisions

- **Project Scoping**: Every deletion operation is strictly scoped to the `projectName` configured during initialization, preventing accidental cross-tenant data loss.
- **Transitional Parity**: Both `MongoProvider` and `PostgresProvider` were updated to return deleted row counts, enabling the new audit-centric API.
- **Efficiency over Purity**: While pure MMR requires recalculating distances for the entire candidate pool, ManasDB applies MMR to an initial `limit * 2` buffer retrieved from the database, balancing mathematical diversity with sub-100ms API latency.
