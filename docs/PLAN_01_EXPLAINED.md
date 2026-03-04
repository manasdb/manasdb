# Plan 1: Project Scaffold + MongoDB Connection Explained

This document provides a detailed, line-by-line explanation of the files constructed throughout Plan 1. Understanding these mechanics now prevents technical debt later.

## Architectural Concepts Introduced

### ECMAScript Modules (ESM) vs CommonJS

In Node.js historically, files used the CommonJS pattern (`require()` for ingestion, `module.exports` for sharing). ManasDB uses modern **ECMAScript Modules (ESM)**.

- **How we enable it:** We set `"type": "module"` in `package.json`.
- **Why we use it:** ESM is the modern standard offering statically analyzable imports/exports (`import` and `export`) and seamlessly mirroring how browser JS behaves.

### The Singleton Pattern

The `MongoConnection` class entirely operates on the Singleton Pattern.

- **Why we use it:** Continually recreating HTTP clients or DB connection pools with every DB access consumes vast system resources. A Singleton ensures our entire application routes through a **single shared active database pool**.
- **Implementation:** By defining our variables generically as static, private class properties (`static #client`), we effectively restrict developers from circumventing our `connect()` and `getDb()` gatekeeper functions.

### Environment Context (`process.env`)

Security via abstraction is key; we cannot hardcode credentials in code.

- Using `dotenv`, we read a local configuration file (`.env`), and Node injects those mapped strings into a globally accessible dictionary known as `process.env`. The SDK relies on variables like `process.env.MONGODB_URI` being reliably seated in memory at runtime.

---

## File By File Deep Dive

### `package.json`

Acts as the central definition of our package.

- It locks `mongodb` to semantic group `^6.0.0` and `dotenv` to `^16.0.0` to prevent unreviewed breaking changes from upstream drivers.
- Declares runnable macro-scripts (`start`, `test:connection`, `health`).

### `src/core/connection.js`

- **Line 1:** `import { MongoClient } from 'mongodb';` - Acquires the native driver module to issue our TCP connections.
- **Lines 11-12:** Defines `static #client = null;` and `static #db = null;`. The `#` prefix introduces native JS encapsulation making them unreadable from outer scopes.
- **Lines 22-24:** Fast-fails. If user omitted the URI dynamically, throw `MANASDB_CONNECTION_ERROR`.
- **Lines 28-30:** Performs our Singleton bailout. If `#client` and `#db` are not null, it returns cleanly avoiding redundant IO actions.
- **Lines 34-39:** Initializes standard driver connectivity and preserves the `db` segment to `#db`.

### `src/index.js`

This is your external API boundary (`"main"`).

- We declare the `ManasDB` class accepting a setup payload `({ uri, dbName, projectName })`.
- `init()` delegates to our MongoConnection manager, then fulfills the reporting requirement by printing `ManasDB initialized  project: [projectName]`.
- Everything from inside `src/core` gets wrapped carefully for external ease of use.

### `src/health.js`

Functions as an independent validation program.

- Pulls `MONGODB_URI` out of context.
- Fires an internal `db.command({ ping: 1 })` to perform a lightweight round trip ping across the wire to Atlas servers. Extremely useful for infrastructure validation without fully triggering the main logic payload.

### `tests/test-connection.js`

Showcases manually constructed assertions without overhead test frameworks (like Jest).

- It wraps 4 distinct behavior checks securely into try/catch blocks allowing runtime execution to securely continue unhindered while surfacing logs per logical block, proving stability mechanically.
