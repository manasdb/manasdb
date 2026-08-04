# Custom Embedding Driver (Plugin Ecosystem)

_Moved from README.md._


Plug in any air-gapped, corporate, or custom embedding model:

```javascript
class MyInternalDriver {
  getModelKey() {
    return "internal-v2";
  }
  async embed(text) {
    const vector = await myCompanyEmbeddingAPI(text);
    return { vector, dims: vector.length, model: this.getModelKey() };
  }
}

const memory = new ManasDB({
  uri: process.env.MONGODB_URI,
  dbName: "corp_knowledge",
  projectName: "contracts",
  modelConfig: {
    source: "custom",
    driver: new MyInternalDriver(),
  },
});
```

ManasDB becomes the **standard interface** over your entire AI embedding stack.

---

