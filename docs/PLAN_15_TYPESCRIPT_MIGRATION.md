# PLAN 15: Phased TypeScript Migration & Zero-Downtime Refactoring Strategy

## 🎯 Goal
Convert **ManasDB** (`@manasdb/core`) from JavaScript to 100% native TypeScript across a sequence of incremental patch releases (`v0.4.3` → `v0.4.7`). 

To preserve stability, existing JavaScript (`.js`) source files co-exist alongside new TypeScript (`.ts`) files during intermediate phases. All legacy `.js` source files will be removed at once in **`v0.4.7`** after comprehensive automated testing.

---

## 🛠️ Branch & Release Strategy

Each phase is executed on a dedicated Git release branch created from `main` or its previous version branch:

```
main
  │
  ├──► branch v0.4.3 [COMPLETED ✅]
  │     ├── tsconfig.json setup
  │     ├── src/types/index.ts
  │     ├── src/utils/*.ts (vector, PIIFilter, Telemetry, TokenCounter, etc.)
  │     └── tests/test-utils-ts.js (automated TS utility unit test suite)
  │
  ├──► branch v0.4.4 [COMPLETED ✅]
  │     ├── src/providers/base.ts
  │     ├── src/core/model-factory.ts
  │     ├── src/core/tree-index.ts
  │     ├── src/core/connection.ts
  │     └── tests/test-core-ts.js (automated TS core unit test suite)
  │
  ├──► branch v0.4.5 [COMPLETED ✅]
  │     ├── src/providers/memory.ts
  │     ├── src/providers/mongodb.ts
  │     ├── src/providers/postgres.ts
  │     ├── src/providers/redis.ts
  │     ├── src/providers/factory.ts
  │     └── tests/test-providers-ts.js (automated TS storage provider test suite)
  │
  ├──► branch v0.4.6 [COMPLETED ✅]
  │     ├── src/core/memory-engine.ts
  │     ├── src/core/providers/*.ts (base, cloud, ollama, transformers)
  │     ├── src/index.ts
  │     ├── src/health.ts & src/benchmark.ts
  │     ├── bin/manas.ts
  │     ├── build.ts (converted root build script build.js -> build.ts)
  │     └── tests/test-sdk-ts.js (automated TS SDK integration test suite)
  │
  └──► branch v0.4.7 [COMPLETED ✅]
        ├── Run full test suite (npm run test:all, test-utils-ts.js, zero-config)
        ├── Remove legacy .js source files in src/ and bin/
        └── Update package.json to v0.4.7 with TypeScript declarations
```

---

## 📐 Key Design Rules & Architecture

1. **Parallel Co-existence:** During releases `v0.4.3` through `v0.4.6`, legacy `.js` files remain intact to ensure existing build targets (`dist/index.cjs`) and test scripts continue working seamlessly.
2. **Type-Only Imports for ESM Compatibility:** When importing interfaces/types across TypeScript files in Node.js ESM mode, `import type { ... } from '...'` syntax must be used so runtime type-stripping (`--experimental-strip-types` / Node 24+) operates cleanly.
3. **Bundler & Esbuild Integration:** `build.ts` uses `esbuild` to bundle `src/index.ts` into CommonJS and compile it to V8 bytecode (`dist/manasdb.jsc`).
4. **Complete Codebase Coverage:** All source files across `src/`, `bin/`, `src/core/providers/`, and root level (`build.ts`) are 100% converted to TypeScript.

---

## 🧪 Verification Matrix Per Branch

Before marking any release branch complete, the following checks must pass:
* `npx tsc --noEmit` / `npx tsc` (0 type errors)
* `npm run build` (Clean CJS & V8 Bytecode compilation via `build.ts`)
* `node tests/test-zero-config.js` (In-memory verification)
* Dedicated module unit tests (`node tests/test-sdk-ts.js`, `node tests/test-providers-ts.js`, etc.)
* Git commit on the specific version branch (`v0.4.x`)
