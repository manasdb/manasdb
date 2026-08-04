# 1. Bootstrapping via Kernel

Date: 2026-08-01

## Status

Accepted

## Context

Previously, initialization logic was heavily scattered across the massive `ManasDB` constructor in `src/index.ts`. This made testing impossible without spinning up a full database and resulted in tight coupling between configuration parsing, database drivers, and cache providers.

## Decision

We will introduce a `Kernel` object in `src/runtime/kernel/` responsible solely for orchestrating the bootstrapping phase of the application. The Kernel parses configuration exactly once, builds the Dependency Injection container, and manages the explicit `Lifecycle` phases.

## Consequences

- Improved testability, as the Kernel can be started with mocked providers.
- Strict isolation of concerns: `ManasDB` is now just a public SDK proxy, while `Kernel` handles actual system boot.
- Requires internal components to subscribe to `LifecycleManager` rather than executing synchronously.
