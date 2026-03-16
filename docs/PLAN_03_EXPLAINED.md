# Plan 3: Semantic Recall & Two-Stage Retrieval Explained

This document explains the logic implemented during Plan 3, focusing on how we fetch (recall) vectors efficiently out of MongoDB natively!

## High-Level Architectural Concepts

### 1. MongoDB `$vectorSearch`

Traditional databases search for exact word matches (e.g., searching "Apple" finds rows with "Apple"). `$vectorSearch` mathematically searches coordinates in a 768-dimensional space instead (e.g., searching "Fruit company" correctly returns "Apple" even though those words weren't in the database!).

Our script executes `vectorsCollection.aggregate(...)` passing in:

- **`index` ("vector_index")**: The specific Atlas construct mapping our float-array dimensions for scaling performance.
- **`path` ("vector")**: The exact JSON key holding our array.
- **`queryVector`**: Our human sentence successfully mapped through the exact same `ModelFactory` pipeline as our ingest flow, ensuring coordinate compatibility natively.
- **`numCandidates`**: How many items Atlas evaluates deeply (typically `limit * 10` to balance speed/accuracy).

### 2. Two-Stage Retrieval Strategy

We deliberately designed ManasDB sequentially across two collections logically for this exact function:

- **Stage 1 (Find the Math)**: Atlas lightning-fast queries the `_manas_vectors` cluster, reading numerical coordinates securely finding the top mathematical matches efficiently mapping the requested vector dimensions.
- **Stage 2 (Hydrate the Source)**: It triggers a `$lookup` passing the matched `content_id` upwards to `_manas_content` intelligently pulling the actual human text, tags, and timestamps matching those arrays.

This structure allows us to query over 1 Million tiny arrays intelligently finding 10 ID correlations without ever loading raw text strings needlessly over network bands!

### 3. Similarity Scoring

The output of `$vectorSearch` embeds a magical property: `vectorSearchScore`.
This is returned using `{ $meta: "vectorSearchScore" }`.

- **Range (0.0 to 1.0)**: Using Cosine Similarity mathematics mapped recursively, `1.0` means the memory is a literal identical clone of our search prompt. `0.85` means it logically perfectly answers our question. `0.20` means it represents totally orthogonal arbitrary topics mapping differently entirely.
- ManasDB effectively uses `options.minScore` natively dropping weak matches securely cleanly maintaining AI pipeline contextual focus natively.

---

## The Code Flow: Line-by-Line Highlight

### Execution of `recall(query)`

1. **Query Translation**: Just like `absorb()`, we fetch `const { vector } = await provider.embed(query, targetDims)` converting our question "Where does the user work?" into math.
2. **Execute Stage 1 & 2 ($vectorSearch + $lookup)**: Our MongoDB pipeline executes simultaneously across vectors, dropping weak scores `< minScore`, extracting matched content.
3. **Array Cleanup**: The raw array natively returns nested metadata including huge chunks of `vector` floating point arrays natively. It calls `SearchFormatter.formatRecallResults()`.
4. **`SearchFormatter` Execution**: It loops through the `rawResults`. It intentionally **drops** the `vector` array preventing 50MB of raw AI node data crashing client apps. It "destructures" nested layers natively flattening `{ id, text, tags, score }` yielding a phenomenally clean, lightweight array JSON object standardizing UI implementations natively perfectly securely!
