# ManasDB — PostgreSQL Basic Example

Minimal runnable example using **PostgreSQL + pgvector** as the single provider.

## Setup

```bash
cp ../../.env.example .env   # fill in POSTGRES_URI
node index.js
```

## Requirements

- PostgreSQL with `pgvector` extension enabled (`CREATE EXTENSION vector;`)

## What this does

1. Connects to PostgreSQL via URI auto-detection
2. Creates the 4-table schema automatically (`_manas_documents`, `_manas_chunks`, `_manas_vectors`, `_manas_telemetry`)
3. Absorbs a short text document
4. Recalls a precise answer with a normalized similarity score
