# Plan 2: Dynamic Providers + Relational Storage Explained

This document provides a detailed, line-by-line understanding of the files implemented during Plan 2. We strive to explain our coding decisions simply, with clear examples, so everyone understands the core mechanics easily!

## High-Level Architectural Concepts

### 1. Split-Collection Relational Architecture

Instead of a single MongoDB collection where text strings and massive numerical vectors live side-by-side (which is very inefficient), we refactored Plan 2 using a multi-collection (relational) setup:

- **`_manas_content` Collection**: Holds the pure text, extracted tags (keywords), project name, and a unique `content_hash`.
- **`_manas_vectors` Collection**: Securely holds the heavy AI embedding array (a list of numbers representing the memory) and maps cleanly to the exact `content_id` from the `_manas_content` collection.

**Example / Why this matters:**
Imagine an application tracks 1 million user actions (memories), and 500,000 of those are the exact same generic error log or a simple string like "Yes".
If we kept it all in one collection, storing 500,000 identical 768-dimension arrays would balloon our MongoDB storage immediately.
By splitting them, "Yes" is saved exactly once in `_manas_content`, and points to exactly one 768-dimension vector in `_manas_vectors`. Deduplication saves massive amounts of database storage!

### 2. Matryoshka Embeddings & Two-Stage Retrieval

ManasDB natively implements the "Matryoshka" technique mapped securely through our BaseProvider (`truncate(vector, targetDims)`).
Similar to Matryoshka nested dolls, some modern AI Vectors allow us to literally "snip" off the end of the float arrays, truncating them while preserving core conceptual mathematical directions. We do this securely by mathematically performing an **L2 Normalization** on the freshly "sliced" array natively to ensure Cosine Similarity map checks won't break later during retrieval operations.

**The Vision (Two-Stage Retrieval):**
Because we extract `options.profile` natively (`speed: 128d`, `balanced: 512d`, `accuracy: max`), developers maps robust logical retrieval architecture down the pipeline efficiently:

1. System maps a "Broad Net" search cleanly against tiny `128d` vectors lightning fast scanning millions of records.
2. System extracts the matching `content_id` strings and gracefully promotes the top 10 results securely mapping against identical `content_id` mappings built accurately at `accuracy` profiles cleanly parsing deep semantics!

### 3. The Provider Factory Pattern

In order to easily swap between multiple AI models (e.g. running AI locally via Node or calling out to an Ollama server cluster), we use a **Factory Pattern** (`src/core/model-factory.js`). We do this to avoid writing confusing, padded `if/else` checks everywhere inside our main SDK logic.

**Example / Why this matters:**
The `ModelFactory` acts like a literal factory manager. When `ManasDB` says, "I need an Ollama AI embedding", the factory builds and returns an active Ollama object. ManasDB can simply call `.embed(text)` safely, never having to worry about how Ollama connects over HTTP or how Transformers.js manages file downloads under the hood.

---

## File By File: Line-by-Line Breakdown

### `src/core/providers/base.provider.js`

This file sets the fundamental "blueprint" (an abstract interface) that all AI providers must follow.

```javascript
export default class BaseProvider {
  async embed(text) {
    throw new Error("embed() must be implemented by subclass");
  }

  getModelKey() {
    throw new Error("getModelKey() must be implemented by subclass");
  }
}
```

- **`export default class BaseProvider`**: We create a parent class. We don't use this directly, we just build other classes (Transformers/Ollama) on top of it.
- **`async embed(text)`**: A function designed to accept a string and return an object containing the vector array, dimension count size, and model tag. It throws an error _here_ to purposely force child classes (like Ollama or Transformers) to write their own specific working logic.
- **`getModelKey()`**: A function that must return a descriptive string (like `local-minilm`) identifying which AI processed the data.

---

### `src/core/model-factory.js`

This file implements the Factory Pattern. It smartly constructs and remembers (caches) our precise AI provider objects.

```javascript
import TransformersProvider from "./providers/transformers.provider.js";
import OllamaProvider from "./providers/ollama.provider.js";

class ModelFactory {
  // A private cache to remember our connections and prevent duplication
  static #instances = {};

  static getProvider(config = {}) {
    // 1. Determine which source we want. Defaults to 'transformers'
    const source = config.source || "transformers";
    const model = config.model || "";

    // 2. We combine 'source' and 'model' into a unique string key (e.g., 'ollama-nomic-embed-text')
    const cacheKey = `${source}-${model}`;

    // 3. Singleton Check: See if we have already built this exact provider tool during this session
    if (!this.#instances[cacheKey]) {
      if (source === "ollama") {
        // Build Ollama specific logic
        this.#instances[cacheKey] = new OllamaProvider(
          model || "nomic-embed-text",
        );
      } else {
        // Build standard local Transformers.js specific logic
        this.#instances[cacheKey] = new TransformersProvider();
      }
    }

    // 4. Hand over the cached tool
    return this.#instances[cacheKey];
  }
}
export default ModelFactory;
```

- **Line `static #instances = {}`**: A safe dictionary retaining the exact engine objects we have made so we do not initialize duplicate, heavy models recursively on massive bulk loads.
- **Lines containing `if (!this.#instances[cacheKey])`**: Ensures that we ONLY instantiate a provider securely the very first time it is queried in the workflow.

---

### `src/index.js` (The `absorb` method in detail)

This is the core of our Relational Architecture logic. Let's trace how memories are processed line-by-line!

```javascript
  async absorb(text) {
    // 1. Validate the text string safely before processing
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('MANASDB_ABSORB_ERROR: Text must be a non-empty string.');
    }

    // 2. Fetch our established MongoDB collections
    const db = MongoConnection.getDb();
    const contentCollection = db.collection('_manas_content');   // The "Words" bucket
    const vectorsCollection = db.collection('_manas_vectors');   // The "Numbers" bucket

    try {
      // -------------------------------------------------------------------------------- //
      // Step A: Deduplicate the content string securely using a Hash footprint
      // Create a deterministic SHA-256 hash (like a lock signature) from the exact string
      const content_hash = crypto.createHash('sha256').update(text).digest('hex');

      // Query raw Mongo searching for this signature footprint
      let contentDoc = await contentCollection.findOne({ content_hash });
      let content_id;

      if (contentDoc) {
        // The exact exact string has been absorbed before! Reuse the existing Datastore ID.
        content_id = contentDoc._id;
      } else {
        // The string is entirely new. Extract standard organic tags (keywords length > 4)
        const tags = MemoryEngine.extractTags(text);

        // Piece together the new record structure securely
        const newContent = {
          text: text,
          tags: tags,
          content_hash: content_hash,
          project: this.projectName,
          createdAt: new Date()
        };
        const contentResult = await contentCollection.insertOne(newContent);
        content_id = contentResult.insertedId; // Harvest the entirely new relational ID dynamically!
      }

      // -------------------------------------------------------------------------------- //
      // Step B: Use dynamic AI dynamically mapping dimension logic to create Relational Vectors

      // Ask our Factory logically for the right tool (Ollama or Transformers)
      const provider = ModelFactory.getProvider(this.modelConfig);

      // Parse Performance Profile
      const profile = options.profile || 'balanced';
      let targetDims;
      if (profile === 'speed') {
        targetDims = 128;
      } else if (profile === 'balanced') {
        targetDims = 512;
      }

      // Run the tool against Matryoshka parameters dynamically parsed (128d, 512d, max array)
      const { vector, dims, model, originalDims } = await provider.embed(text, targetDims);

      // Hash footprint using Relational Database logic!
      // This confirms we map the exact Content ID accurately matching to the specific AI Model Configuration and exact Profile dimension.
      const embedding_hash = crypto.createHash('sha256')
        .update(content_id.toString() + model + profile)
        .digest('hex');

      // Query database securely to see if this exact memory+model array has been drawn before
      let vectorDoc = await vectorsCollection.findOne({ embedding_hash });
      let vector_id;

      if (vectorDoc) {
        // System has already mapped this exact vector array! Grab its ID.
        vector_id = vectorDoc._id;
      } else {
        // System has not created this array yet. Structure the dimensional schema natively.
        const newVector = {
          content_id: content_id,
          model: model,
          dims: dims,
          profile: profile,
          originalDims: originalDims,
          precision: "float32",
          vector: vector,
          embedding_hash: embedding_hash,
          createdAt: new Date()
        };
        const vectorResult = await vectorsCollection.insertOne(newVector);
        vector_id = vectorResult.insertedId; // Harvest Relational Vector ID
      }

      // -------------------------------------------------------------------------------- //
      // 3. Return a clean JSON map highlighting the exact relational identifiers generated natively
      return { contentId: content_id, vectorId: vector_id };

    } catch (error) { ... }
  }
```

**Summary of the Flow:** The `absorb` command carefully generates string footprints (hashes) dynamically before inserting data into standard MongoDB schemas. If the string footprint (`content_hash`) or the specific numeric footprint (`embedding_hash`) exact combination is found securely, ManasDB gracefully reuses the exact MongoDB IDs dynamically without writing wasteful duplicate bytes scaling performance accurately!
