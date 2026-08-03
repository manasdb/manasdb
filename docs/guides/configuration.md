# Configuration Reference

_Moved from README.md._


```javascript
new ManasDB({
  // ── Single Database (Auto-Discovery) ────────────────────────────────
  // Supply a connection string. ManasDB reads the prefix to mount the
  // correct provider automatically. No dbType needed.
  uri: process.env.DATABASE_URI, // 'mongodb://' or 'postgres://' detected automatically
  dbName: "my_database", // Optional: required for MongoDB only

  // ── OR – Explicit single DB with dbType override ─────────────────────
  // uri: process.env.DATABASE_URI,
  // dbType: 'postgres',   // Force: 'mongodb' | 'postgres' | 'pg'

  // ── OR – Polyglot Mode (Multiple Databases) ──────────────────────────
  // databases: [
  //   { type: "mongodb", uri: process.env.MONGODB_URI, dbName: "my_database" },
  //   { type: "postgres", uri: process.env.POSTGRES_URI },
  // ],

  projectName: "my_project", // Namespace — isolates data per project.
  modelConfig: {
    source: "gemini", // 'transformers' | 'ollama' | 'openai' | 'gemini' | 'custom'
    model: "gemini-embedding-001", // Optional. Provider-specific model name.
    driver: MyCustomDriver, // Required only when source: 'custom'
  },
  piiShield: {
    enabled: true,
    customRules: [/MY_REGEX/g], // Additional PII patterns to redact
  },
  cache: {
    provider: "redis",
    uri: process.env.REDIS_URI || "redis://localhost:6379",
    semanticThreshold: 0.92, // Fuzzy matching threshold for cache hits
    ttl: 3600, // Expiration time in seconds
  },
  reasoning: {
    enabled: true, // Enables TreeIndex layout for reasoningRecall()
  },
  telemetry: true, // Logs events to _manas_telemetry (all configured databases)
  debug: false, // Prints model/profile keys on each operation
});
```

### 🚨 Strict Mode (Zero-Config Protection)

To prevent silent failures if you accidentally omit a database URI (or forget to load a `.env` file), ManasDB implements a **Strict Mode**.

- Initializing `new ManasDB({})` and calling `await memory.init()` without databases will **succeed and issue a warning** (so it never crashes your server on boot).
- However, if your application tries to execute `await memory.absorb()` or `await memory.recall()` when zero databases are loaded, ManasDB will **Fail Fast** and throw a descriptive error: `MANASDB_ERROR: Cannot absorb(). No valid database providers were configured`.

---

