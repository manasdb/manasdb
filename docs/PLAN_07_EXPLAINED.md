# Plan 7: Command Line Interface (CLI)

This document details the architecture and rationale behind the ManasDB CLI (`bin/manas.js`), which provides immediate, visually clear insights into the operational health and financial metrics of the Vector Database.

## Purpose of the CLI

While telemetry actively collects powerful metrics silently in the background (Plan 6), developers need an immediate, frictionless way to access this data without writing custom queries or dashboard integrations. The CLI achieves this by directly parsing the internal MongoDB collections and aggregating the telemetry dynamically.

## Architecture & Implementation

The CLI is engineered specifically isolated as an independent Node.js executable script located at `bin/manas.js`. It leverages standard terminal tooling (like `commander` for explicit argument parsing and `chalk` for terminal styling).

By mapping `"bin": { "manas": "bin/manas.js" }` within `package.json`, NPM automatically handles symlinking the command globally when the developer installs the ManasDB SDK.

### Standalone Environment Loading

Instead of relying on an active Node Application context to bootstrap properties, the CLI autonomously provisions its own context explicitly. It loads the `MONGODB_URI` from the user's `.env` file organically in the current working directory, avoiding the need for manual connection strings during execution.

If the environment configuration is missing, it provides structured Setup Instructions and terminates cleanly rather than crashing.

## Provided Commands

### 1. `manas stats` (The ROI Visualizer)

This command bridges the technical layer (AI models) to pure Business Intelligence.

- It iterates across every `ABSORB_COMPLETED` and `DEDUPLICATED` event logged natively within `_manas_telemetry`.
- It calculates exactly:
  - **Tokens Saved**: The literal count of vector payload executions that ManasDB blocked mathematically via hashing.
  - **Financial Savings ($)**: The translated cost value resulting from omitted Cloud API constraints (e.g. OpenAI/Gemini rates).
  - **Latency Bypassed**: The net computation and network transfer time literally saved from system execution pipelines.

### 2. `manas list`

An immediate sanity-check functionality. It queries the `_manas_content` collection indexing backwards via `-1` to extract the 10 most recently digested memories. It instantly verifies if the system is properly absorbing string sequences natively truncating heavily loaded blocks for formatting readability dynamically.

### 3. `manas health`

Directly probes the MongoDB mapping arrays verifying the structure organically:

- Confirms immediate TCP connectivity to the Cluster.
- Probes Atlas explicitly requesting `listSearchIndexes()` specifically confirming whether the required `$vectorSearch` indexes exist locally on the `_manas_vectors` collection, allowing developers to debug 500-level query pipeline failures structurally.

## Conclusion

The CLI transforms ManasDB from a pure headless database wrapper into an observable, completely self-validating product directly measuring its exact financial contribution exactly dynamically.
