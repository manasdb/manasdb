# ManasDB — Polyglot Mode Example

Runnable example broadcasting to **both MongoDB Atlas and PostgreSQL** simultaneously.

## Setup

```bash
cp ../../.env.example .env   # fill in both MONGODB_URI and POSTGRES_URI
node index.js
```

## What this demonstrates

- `absorb()` writes to both databases in a single call
- `recall()` queries both, merges results, deduplicates by text hash, and ranks by normalized score
- Each result shows which `database` it came from (`"mongodb"` or `"postgres"`)
- `memory.health()` reports the live status of all active providers
- `telemetry: true` logs every absorb/recall event to `_manas_telemetry` in both DBs
- `piiShield: true` redacts emails, phone numbers, SSNs before any text is stored
