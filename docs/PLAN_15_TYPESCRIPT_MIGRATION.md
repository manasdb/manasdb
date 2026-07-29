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
  ├──► branch v0.4.4 [NEXT ⏳]
  │     ├── src/providers/base.ts
  │     ├── src/core/model-factory.ts
  │     ├── src/core/tree-index.ts
  │     └── src/core/connection.ts
  │
  ├──► branch v0.4.5 [PLANNED]
  │     ├── src/providers/memory.ts
  │     ├── src/providers/mongodb.ts
  │     ├── src/providers/postgres.ts
  │     ├── src/providers/redis.ts
  │     └── src/providers/factory.ts
  │
  ├──► branch v0.4.6 [PLANNED]
  │     ├── src/core/memory-engine.ts
  │     ├── src/index.ts
  │     ├── bin/manas.ts
  │     └── build.js update for TS entry points & .d.ts generation
  │
  └──► branch v0.4.7 [FINAL VERIFICATION & CLEANUP]
        ├── Run full test suite (npm run test:all, test-utils-ts.js, zero-config)
        ├── Remove legacy .js source files in src/ and bin/
        └── Update package.json to v0.4.7 with TypeScript declarations
```

---

## 📐 Key Design Rules & Architecture

1. **Parallel Co-existence:** During releases `v0.4.3` through `v0.4.6`, legacy `.js` files remain intact to ensure existing build targets (`dist/index.cjs`) and test scripts continue working seamlessly.
2. **Type-Only Imports for ESM Compatibility:** When importing interfaces/types across TypeScript files in Node.js ESM mode, `import type { ... } from '...'` syntax must be used so runtime type-stripping (`--experimental-strip-types` / Node 24+) operates cleanly.
3. **Bundler & Esbuild Integration:** `build.js` uses `esbuild`, which handles both `.ts` and `.js` entry points natively without extra transpilation steps.

---

## 🧪 Verification Matrix Per Branch

Before marking any release branch complete, the following checks must pass:
* `npx tsc --noEmit` / `npx tsc` (0 type errors)
* `npm run build` (Clean CJS & V8 Bytecode compilation)
* `node tests/test-zero-config.js` (In-memory verification)
* Dedicated module unit tests (e.g. `node tests/test-utils-ts.js`)
* Git commit on the specific version branch (`v0.4.x`)
