# Plan 2: Dynamic Providers + Relational Storage Explained

This document provides a detailed, line-by-line understanding of the files implemented during Plan 2. We strive to explain our coding decisions simply, with clear examples, so everyone understands the core mechanics easily!

## High-Level Architectural Concepts

### 1. Split-Collection Relational Architecture

Instead of a single MongoDB collection where text strings and massive numerical vectors live side-by-side (which is very inefficient), we refactored Plan 2 using a multi-collection (relational) setup:

- **`_manas_content` Collection**: Holds the pure text, extracted tags (keywords), project name, and a unique `content_hash`.
- **`_manas_vectors` Collection**: Securely holds the heavy AI embedding array (a list of numbers representing the memory) and maps cleanly to the exact `content_id` from the `_manas_content` collection.
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
- **Lines containing `if (!this.#instances[cacheKey])`**: Ensures that we ONLY instantiate a provider securely the very first time it is queried in the workflow### 2. Polyglot Vector Architecture

ManasDB natively implements a polyglot architecture. Instead of being locked into a single database, the engine broadcasts writes to all active providers. We use true **Vector Cosine Similarity** as the gold standard for retrieval across all platforms.

**The Vision:**
By using a unified embedding standard across all providers, developers can:
1. Scale their AI memory horizontally across different database types.
2. Ensure consistent search results regardless of the underlying storage engine.
3. Decouple AI logic from database-specific vector search idiosyncrasies.

---

## File By File: Line-by-Line Breakdown

### `src/core/memory-engine.js` (Partial)

```javascript
  static _cosine(a, b) {
    if (!a || !b) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0, na = 0, nb = 0;
    
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      na  += a[i] * a[i];
      nb  += b[i] * b[i];
    }
    
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  }
```

- **`static _cosine(a, b)`**: Implements the mathematical formula for Cosine Similarity. This ensures that even if we use different AI models or providers, the "semantic distance" remains a consistent metric across the entire system.

---

### `src/index.js` (The `absorb` method internal logic)

This is the core of our logic. Let's trace how memories are processed!

```javascript
  async absorb(text) {
    // 1. Generate Query Vector using AI Provider
    const queryVector = await this.memoryEngine.generateEmbedding(text);

    // 2. Broadcast to all active Database Drivers
    const results = await Promise.all(this.databaseDrivers.map(driver => 
      driver.absorb({ text, queryVector, tags: this.extractTags(text) })
    ));

    // 3. Return aggregated summary
    return results;
  }
```

**Summary of the Flow:** The `absorb` command carefully processes text into vectors FIRST, and then broadcasts that payload to all connected databases. This ensures high performance and consistent indexing across Polyglot environments!
