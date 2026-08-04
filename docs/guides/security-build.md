# Security: Machine Bytecode Build

_Moved from README.md._


For production deployments where source code must remain proprietary:

```bash
npm run build
```

This runs a three-stage compiler pipeline:

1. **Bundle** — `esbuild` bundles all internal source into a single CommonJS file, excluding `node_modules`
2. **Minify** — variable names and whitespace are aggressively stripped
3. **Bytecode** — `bytenode` compiles the bundle into V8 machine bytecode (`.jsc`)

Your private chunking algorithms, scoring formulas, and pipeline logic become **Obfuscated and compiled** to V8 bytecode to protect proprietary logic. The output is a `dist/index.cjs` loader + `dist/manasdb.jsc` binary.

---

<details>
<summary>📁 Project Structure</summary>

```
manasdb/
├── bin/
│   └── manas.js            # CLI tool (stats, health, trace, benchmark)
├── src/
│   ├── index.js            # Main SDK class (ManasDB) — URI auto-discovery + polyglot orchestration
│   ├── benchmark.js        # Benchmark suite runner
│   ├── health.js           # Health check script
│   ├── providers/          # Storage providers (Polyglot Persistence)
│   │   ├── base.js             # BaseProvider interface
│   │   ├── mongodb.js          # MongoProvider (MongoDB Atlas)
│   │   └── postgres.js         # PostgresProvider (pgvector)
│   ├── core/
│   │   ├── connection.js       # MongoDB singleton connection manager
│   │   ├── memory-engine.js    # Low-level memory operations
│   │   ├── model-factory.js    # Provider factory + custom driver support
│   │   └── providers/
│   │       ├── base.provider.js
│   │       ├── cloud.provider.js    # OpenAI + Gemini
│   │       ├── ollama.provider.js
│   │       └── transformers.provider.js  # Local @xenova/transformers
│   └── providers/             # Storage drivers (DB-agnostic)
│       ├── base.js            #   BaseProvider interface all drivers extend
│       ├── factory.js         #   ProviderFactory — lazy dynamic import registry (Plan 10)
│       ├── mongodb.js         #   MongoDB Atlas vector search driver
│       └── postgres.js        #   PostgreSQL + pgvector driver
│   └── utils/
│       ├── CostCalculator.js   # Token estimation & financial cost calc
│       ├── ModelRegistry.js    # Dimension lookup per model
│       ├── PIIFilter.js        # PII redaction engine
│       ├── SearchFormatter.js  # Result formatting utilities
│       ├── Telemetry.js        # Polyglot Fire-and-forget event logging
│       └── TokenCounter.js     # Token counting helpers
├── tests/
│   ├── test-e2e.js            # MongoDB E2E QA test suite
│   ├── test-e2e-pg.js         # PostgreSQL E2E QA test suite
│   ├── test-features.js       # MongoDB feature tests (PII, dedup, cache)
│   ├── test-features-pg.js    # PostgreSQL feature tests
│   ├── test-large-random.js   # MongoDB large document tests
│   ├── test-large-random-pg.js # PostgreSQL large document tests
│   ├── test-polyglot-e2e.js   # Polyglot (Mongo+Postgres) E2E tests
│   └── test-polyglot-features.js # Polyglot feature tests
├── examples/                  # Runnable copy-paste examples
│   ├── mongodb-basic/         # MongoDB-only starter project
│   │   ├── index.js           #   Working example code
│   │   ├── test.js            #   Self-contained test suite (16 assertions)
│   │   └── README.md
│   ├── postgres-basic/        # PostgreSQL-only starter project
│   │   ├── index.js
│   │   ├── test.js
│   │   └── README.md
│   └── polyglot-mode/         # Both providers simultaneously
│       ├── index.js
│       ├── test.js            #   Polyglot-specific assertions (health, merge, dedup)
│       └── README.md
├── docs/                      # Architecture decision documents (PLAN_01 through PLAN_10)
├── dist/                      # Compiled bytecode output (npm run build)
├── build.js                   # Security compiler (esbuild + bytenode)
├── verify-lazy-loading.js     # Proves lazy-loading works (11 assertions)
└── package.json
```

> See [`/examples`](./examples) for self-contained, runnable projects — copy one into your own repo to get started immediately.

</details>

---

