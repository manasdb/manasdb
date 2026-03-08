# ManasDB — MongoDB Basic Example

Minimal runnable example using **MongoDB Atlas** as the single provider.

## Setup

```bash
cp ../../.env.example .env   # fill in MONGODB_URI
node index.js
```

## What this does

1. Connects to MongoDB Atlas via URI auto-detection
2. Absorbs a short text document
3. Recalls a precise answer with a similarity score
