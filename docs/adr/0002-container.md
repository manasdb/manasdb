# 2. Native Dependency Injection

Date: 2026-08-01

## Status

Accepted

## Context

To decouple dependencies and invert control, we need a Service Container. While libraries like `InversifyJS` or `reflect-metadata` are popular, they introduce decorators, runtime magic, and bundle size overhead.

## Decision

We will implement a lightweight, native, typed Dependency Injection container (`ServiceContainer`) using simple `container.register()` and `container.resolve()` mechanics. We will avoid the use of `reflect-metadata`.

## Consequences

- No external dependencies added for DI.
- Registration is explicitly typed and fast.
- Requires manual registration rather than automatic decorator-based resolution.
