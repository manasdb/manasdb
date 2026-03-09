# Plan 10: Lazy-Loading ProviderFactory Architecture

This document details the architectural enhancement from **Plan 10**, which introduced a **lazy-loading ProviderFactory** to make ManasDB fully database-agnostic at the package level.

## 1. The Problem Plan 10 Solved

Prior to Plan 10, `src/index.js` contained two **static top-level imports**:

```javascript
// OLD — both packages loaded at process start, regardless of config
import PostgresProvider from "./providers/postgres.js";
import MongoProvider from "./providers/mongodb.js";
```

This caused two concrete issues in production:

1. **Hard crash on missing dependency**: A user who only installed `mongodb` (no `pg`) would get a `Cannot find module 'pg'` error the moment they imported `@manasdb/core`, before any code ran.

2. **Broken promise of optional dependencies**: The README advertised that PostgreSQL was optional, but the package loaded `pg` unconditionally.

---

## 2. The ProviderFactory Solution

### 2.1 New File: `src/providers/factory.js`

A centralized registry maps provider type strings to their file paths:

```javascript
const PROVIDER_REGISTRY = {
  mongodb: { path: "./mongodb.js", requiredPackage: "mongodb" },
  postgres: { path: "./postgres.js", requiredPackage: "pg" },
  pg: { path: "./postgres.js", requiredPackage: "pg" }, // alias
  postgresql: { path: "./postgres.js", requiredPackage: "pg" }, // alias
};
```

Providers are loaded **on demand** using ESM dynamic `import()`:

```javascript
async function loadProviderClass(type) {
  const entry = PROVIDER_REGISTRY[type];
  if (!entry) throw new Error(`[ManasDB] Unknown provider type "${type}". ...`);

  try {
    const mod = await import(entry.path);
    return mod.default;
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        `[ManasDB] The "${entry.requiredPackage}" package is required. Run: npm install ${entry.requiredPackage}`,
      );
    }
    throw err;
  }
}
```

A **module-level singleton cache** (`Map`) ensures each provider module is only dynamically imported once per process, even if multiple instances of the same database type are configured.

### 2.2 URI Auto-Detection

`inferTypeFromUri(uri)` now lives in `factory.js` (instead of being duplicated in `index.js`), making it the single source of truth:

```javascript
export function inferTypeFromUri(uri = "") {
  const l = uri.toLowerCase();
  if (l.startsWith("postgres") || l.startsWith("postgresql")) return "postgres";
  return "mongodb";
}
```

Explicit `type` fields always win. If an explicit type is unrecognized, the factory throws immediately with a clear "Unknown provider type" error — **no silent fallback** to MongoDB.

---

## 3. Changes to `src/index.js`

### 3.1 Constructor

The constructor no longer instantiates any providers. It only:

- Normalizes the config (single `uri` → `databases[]`)
- Stores raw `_dbConfigs` for deferred resolution
- Sets `_initCalled = false`

```javascript
// Before (instantiated eagerly):
for (const dbConfig of dbConfigs) {
  if (dbConfig.type === 'postgres') {
    this.databaseDrivers.push(new PostgresProvider(...));
  } else {
    this.databaseDrivers.push(new MongoProvider(...));
  }
}

// After (deferred):
this._dbConfigs  = dbConfigs;
this._initCalled = false;
```

### 3.2 `init()` — The Single Gateway

`init()` is now the **only place** where database drivers are loaded:

```javascript
async init() {
  if (!this._initCalled) {
    // This is where 'pg' or 'mongodb' are actually imported
    this.databaseDrivers = await createProviders(this._dbConfigs, this.projectName, this.debug);
    this._initCalled = true;
  }
  await Promise.all(this.databaseDrivers.map(d => d.init(targetDims)));
}
```

### 3.3 Strict Mode Guards in `absorb()` and `recall()`

Both public methods now throw a descriptive error if called before `init()`:

```javascript
if (!this._initCalled)
  throw new Error("MANASDB: Call await memory.init() before absorb().");
```

**Strict Provider Validation**: To prevent "silent failures" where a user forgets to provide a valid `uri` in `.env` and `init()` succeeds with 0 databases, `absorb()` and `recall()` now hard-crash (Fail Fast) the immediate operation:

```javascript
if (this.databaseDrivers.length === 0) {
  throw new Error(
    "MANASDB_ERROR: Cannot absorb(). No valid database providers were configured (e.g., missing MongoDB/Postgres URI).",
  );
}
```

---

## 4. Verification

A dedicated script `verify-lazy-loading.js` at the repo root proves the following:

| Check                                                                        | Result |
| ---------------------------------------------------------------------------- | ------ |
| `databaseDrivers.length === 0` immediately after `new ManasDB()`             | ✅     |
| `_initCalled === false` before `init()`                                      | ✅     |
| `absorb()` throws a clear error before `init()`                              | ✅     |
| After `init()` with MongoDB config — only `MongoProvider` instantiated       | ✅     |
| `PostgresProvider` was **never** instantiated in a MongoDB-only run          | ✅     |
| Unknown type `'redis'` throws `"Unknown provider type"` — no silent fallback | ✅     |
| `recall()` returns correct results after `absorb()`                          | ✅     |

Run it yourself:

```bash
node verify-lazy-loading.js
```

---

## 5. Build System Impact (`build.js`)

The esbuild configuration must mark **all database drivers as external** so that dynamic `import()` inside the bundled/compiled output still resolves at runtime from `node_modules`:

```javascript
external: [
  "mongodb",
  "pg", // ← Added in Plan 10
  "ollama",
  "openai",
  "@google/generative-ai",
  "@xenova/transformers",
  "dotenv",
  "chalk",
];
```

Without `'pg'` in the external list, esbuild would statically bundle `pg` into the bytecode — defeating the lazy-loading guarantee and crashing MongoDB-only users.

---

## 6. Adding New Database Providers (Future)

To add a new provider (e.g. Redis, Elasticsearch), the only change needed is:

1. Create `src/providers/redis.js` extending `BaseProvider`
2. Add an entry to `PROVIDER_REGISTRY` in `factory.js`:
   ```javascript
   redis: { path: './redis.js', requiredPackage: 'ioredis', displayName: 'Redis' }
   ```
3. Add `'ioredis'` to the `external` list in `build.js`

No changes to `src/index.js` are required.
