# Plan 4: Universal Model Adapter Explained

This document unpacks our progression towards a cloud-agnostic "Universal Architecture." We engineered ManasDB to swap massive AI embedding providers using simple declarative code instead of manually tearing down massive configuration pipelines dynamically!

## High-Level Architectural Concepts

### 1. The Adapter Pattern & Polymorphism

All embedding integrations securely funnel through `BaseProvider` which mandates exactly one strict command signature inherently:
`async embed(text, targetDims)` returning ` { vector, dims, model, originalDims }`.

**Why this matters:**
If `ManasDB` attempts an integration using Google's `@google/generative-ai` pipeline, it requires totally entirely different API key structuring, payload objects, array mapping endpoints natively. By wrapping it in `src/core/providers/cloud.provider.js -> GeminiProvider`, the core `index.js` `absorb()` loops remain structurally **blind** exactly to what tool generated the mapping! It polymorphically simply calls `.embed()` correctly yielding mathematical structures.

### 2. Multi-Brain Relational Modeling

Because `embedding_hash` explicitly integrates exactly the string literal `.model` identifier dynamically, ManasDB performs an incredibly complex behavioral mapping organically.

**Example execution flow:**

1. You execute `.absorb("The matrix is real")` via exactly the `openai` mapper configuration. It maps Content ID `123`, creating OpenAI mapping `vec-A`.
2. You execute `.absorb("The matrix is real")` via exactly the `gemini` mapper configuration seamlessly natively next week. It finds explicitly Content ID `123`. It hashes `123` + `"gemini-gemini-embedding-001"` generating an entirely new Vector Hash! It organically layers Gemini mapping `vec-B` right below the existing system natively.

You simply built TWO entirely different "Brain Versions" organically mapped exactly correctly downwards directly indexing the exact single literal source truth text accurately. No database collisions. No textual fragmentation natively!

### 3. ModelRegistry Validations

With dynamic dimensionality logic, checking index sizes statically becomes impossible. `ModelRegistry` statically bridges these gaps natively returning expected baseline dimensions precisely mapping cleanly against pipeline default schemas (e.g. `openai: 1536`, `gemini: 768`, `local: 384`).
