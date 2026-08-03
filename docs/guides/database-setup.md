# Database Setup — MongoDB, PostgreSQL, or Both (Polyglot)

_Moved from README.md — the per-database config variants._

**1. MongoDB Only**

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "my_ai_app",
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" }, // Free local embeddings
  telemetry: true, // Default: true. Records performance metrics to
  // _manas_telemetry in your own database.
  // Powers npx manas stats + ui dashboard.
  // Set false to disable. Data never leaves your server.
  debug: false,
});
```

**2. PostgreSQL Only**

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  uri: process.env.POSTGRES_URI,
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" },
  telemetry: true,
  debug: false,
});
```

**3. Polyglot (Both MongoDB & PostgreSQL)**

```javascript
import { ManasDB } from "@manasdb/core";

const memory = new ManasDB({
  databases: [
    { type: "mongodb", uri: process.env.MONGODB_URI, dbName: "my_ai_app" },
    { type: "postgres", uri: process.env.POSTGRES_URI },
  ],
  cache: { provider: "redis", uri: process.env.REDIS_URI }, // Tier 1 Cache
  reasoning: { enabled: true }, // Enable Hierarchical Tree Index
  projectName: "knowledge_base",
  modelConfig: { source: "transformers" },
  telemetry: true,
  debug: false,
});
await memory.init();

// Store knowledge
await memory.absorb(`
  The James Webb Space Telescope launched on December 25, 2021.
  It uses infrared imaging to observe galaxies formed shortly after the Big Bang.
  Its primary mirror spans 6.5 meters and is made of 18 hexagonal beryllium segments.
`);

// Retrieve precise answers using Hierarchical Reasoning Tree
const treeResult = await memory.reasoningRecall(
  "What is James Webb's mirror made of?",
  {
    topSections: 3,
    topSection: 0,
  },
);

console.log(treeResult.leaves[0].text);
// → "Its primary mirror spans 6.5 meters and is made of 18 hexagonal beryllium segments."

// Access the pipeline trace to view telemetry and caching
console.log(treeResult._trace);
// → { reasoning: true, cacheHit: 'redis', tokens: 9, costUSD: 0 }
```
