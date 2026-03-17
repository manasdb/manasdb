import ManasDB from '../src/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function runTest() {
  const memory = new ManasDB({
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: 'manas_db_recall_test',
    projectName: 'recall_test',
    modelConfig: {
      source: 'ollama',
      model: 'nomic-embed-text:latest'
    },
    debug: true
  });

  console.log('--- Initializing ManasDB ---');
  await memory.init();

  const testData = [
    "The AI memory system project is a complex library built with Node.js and MongoDB.",
    "It uses vector search and keyword search to retrieve relevant information.",
    "Optimization is key for near-instant responses.",
    "The library supports polyglot persistence across multiple databases.",
    "Hybrid search combines semantic and lexical matching."
  ];

  console.log('\n--- Memorizing Test Data ---');
  for (const text of testData) {
    await memory.absorb(text);
  }

  console.log('\n--- Testing Recall Performance (Keyword + Vector) ---');
  const queries = [
    "AI memory system project", // Broad match
    "vector search",         // Keyword specific
    "hybrid search"           // High semantic value
  ];

  for (const query of queries) {
    console.log(`\nQuery: "${query}"`);
    const start = Date.now();
    const results = await memory.recall(query, { mode: 'qa', limit: 3 });
    const duration = Date.now() - start;

    console.log(`Latency: ${duration}ms`);
    console.log('Results:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. [Score: ${r.score.toFixed(4)}] ${r.text.substring(0, 100)}...`);
    });
    console.log('Trace Hybrid Sources:', results._trace?.hybridSources);
  }

  console.log('\n--- Testing Document Mode (Clubbing) ---');
  const startClub = Date.now();
  const docResults = await memory.recall("AI memory system project", { mode: 'document', limit: 1 });
  const durationClub = Date.now() - startClub;
  console.log(`Latency (Document Mode): ${durationClub}ms`);
  console.log('Document Result Length:', docResults[0]?.text.length);

  await memory.close();
  process.exit(0);
}

runTest().catch(console.error);
