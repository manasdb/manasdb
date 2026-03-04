# Plan 2 (Revised): Parent-Child Context-Healer

## The Context Window Problem

When embedding a massive document natively, most classical vector architectures chunk the document into completely isolated standalone strings (e.g., splitting by paragraph or sentence). When an LLM executes a RAG retrieval asking for a specific detail, `$vectorSearch` mathematically returns _only_ that isolated sentence.
This strips the LLM of the surrounding context, destroying reasoning capabilities.

## The "Context-Healer" Solution

ManasDB solves this by establishing strict relational models mapping between parent documents and vectorized children organically.

### 1. Absorb Flow (Sentence Splitting)

During the `.absorb(text)` command execution:

- Instead of shoving massive bodies of text into a single embedding, ManasDB maps the _entire raw text_ directly into `_manas_content` explicitly as a metadata-rich "Parent Document" natively, capturing its exact `_id`.
- The document is automatically exploded into structural children sentences dynamically executing simple algorithmic Regex mappings preserving exact punctuation boundaries.
- **Only** the children are mapped into the physical Matrix Float32 API calls (`_manas_vectors`), with each child vector strictly storing a `parentId` relational metadata tag tracking directly up.

### 2. Recall Flow (Context Healing payload)

During the `.recall(query)` search execution:

- The SDK utilizes standard mathematical `$vectorSearch` retrieving the exact, highly-isolated sentence that logically maps closely to the user query structurally.
- A native $lookup join and iteration parses the exact matched records extracting all dynamic `parentId` keys natively.
- **The Healing Process**: ManasDB performs a unified `find({ _id: { $in: parentIds } })` returning the entire original Parent documents mapped correctly, physically replacing the isolated sentences!
- Telemetry dynamically overrides local calculations aggregating the actual total exact tokens resolved across the fully healed documents ensuring absolute precision for billing and cost-tracking constraints structurally!

## Result

Users get the mathematical accuracy of a vector retrieving an exact sentence, while structurally yielding the full surrounding payload back to their local LLM for context-aware generation seamlessly.
