# Plan 14: Enterprise Governance, Portability & Multi-Tenancy

This document outlines the architecture for ManasDB's enterprise-grade governance features, including financial budgeting, seamless data migration, and project-based multi-tenancy.

---

## 1. Objectives

- **Financial Governance**: Prevent runaway AI costs with hard monthly spending caps and pre-flight estimation.
- **Data Portability**: Allow users to switch database providers or embedding models without data loss.
- **Multi-Tenancy**: Provide a high-level utility for managing multiple isolated project instances (`ProjectRegistry`).
- **Observability**: Expose internal retrieval decision-making and cost metadata via programmatic hooks.

---

## 2. Technical Implementation

### A. Financial Budgeting (`CostCalculator`)
Integrated into the `absorb()` and `recall()` pipelines.
- **Pre-flight Estimation**: Before hitting external APIs, the system estimates token counts and USD costs.
- **Hard Caps**: In the constructor config (`retry: { budget: { monthlyLimit: X } }`), users can set a dollar limit.
- **Persistence**: Spend is tracked natively in each database provider via the `_manas_telemetry` collection.

### B. Data Migration (`migrateTo`)
A core refinement to the `ManasDB` class.
- **Re-embedding Engine**: If the target provider uses a different model, the system automatically reconstructs text from chunks and generates new embeddings.
- **Provider Switching**: Seamlessly move data from MongoDB to PostgreSQL.

### C. Project Registry (`ProjectRegistry`)
A utility class located in `src/utils/ProjectRegistry.js`.
- **Lazy Initialization**: Instances are only created when requested for a specific `projectName`.
- **Shared Configuration**: Allows defining a base configuration (e.g., shared OpenAI keys) that applies across all tenants.

### D. Observability (`onTrace`)
- **Trace Subscription**: Developers can subscribe to `onTrace(callback)` to receive full JSON payloads of every retrieval decision.
- **Metadata**: Includes `savedByCache`, `retrievalPath`, `actual_cost`, and `finalScore`.

---

## 3. Data Flow

1.  **User call** (`absorb`/`recall`).
2.  **Budget Guard**: Queries `getMonthlySpend()` from the primary provider.
3.  **Execution**: If within budget, proceeds to PII Shield and Model APIs.
4.  **Telemetry**: Logs the specific `actual_cost` in the background.

---

## 4. Why This Matters

As AI move into production, "cost-blind" retrieval is a liability. Plan 14 transforms ManasDB from a simple vector store into a governed memory layer suitable for enterprise SaaS applications.
