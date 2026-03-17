import dotenv from 'dotenv';
import MongoProvider from '../../src/providers/mongodb.js';
import PostgresProvider from '../../src/providers/postgres.js';
import ModelRegistry from '../../src/utils/ModelRegistry.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const POSTGRES_URI = process.env.POSTGRES_URI;
const PROJECT_NAME = 'advanced_parity_project';
const MODEL_NAME = 'transformers'; // 384 dims
const DIMS = ModelRegistry.getDimensions(MODEL_NAME) || 384;

async function advancedParityDiagnostics() {
  console.log('=== ADVANCED PARITY DIAGNOSTICS (Dynamic) ===\n');
  console.log(`Target Model: ${MODEL_NAME} (${DIMS} dims)`);

  const mongo = new MongoProvider(MONGODB_URI, 'manasdb_advanced', PROJECT_NAME, true);
  const pg = new PostgresProvider(POSTGRES_URI, 'manasdb_advanced', PROJECT_NAME, true);

  try {
    await mongo.init(DIMS);
    console.log(`✅ MongoDB initialized with ${DIMS} dimensions.`);
  } catch (e) {
    console.error('❌ MongoDB initialization failed:', e.message);
  }

  let pgActive = false;
  try {
    await pg.init(DIMS);
    pgActive = true;
    console.log(`✅ PostgreSQL initialized with ${DIMS} dimensions.`);
  } catch (e) {
    console.error('❌ PostgreSQL initialization failed:', e.message);
  }

  console.log('\nClearing old diagnostic data...');
  await mongo.clear();
  if (pgActive) await pg.clear();

  // Helper to create a specific vector and store it
  const createMockAi = (vec) => ({
    getModelKey: () => MODEL_NAME,
    embed: async (text, dims) => ({
      vector: vec,
      dims: dims || DIMS,
      model: MODEL_NAME,
      originalDims: dims || DIMS
    })
  });

  const v1 = new Array(DIMS).fill(0).map(() => Math.random());
  const v2 = new Array(DIMS).fill(0).map(() => Math.random());
  const v3 = new Array(DIMS).fill(0).map(() => Math.random());

  const store = async (id, vec, text) => {
    const params = {
      rawText: text,
      filteredText: text,
      chunks: [{ text, embedText: text, chunkIndex: 0 }],
      parentTags: { id },
      aiProvider: createMockAi(vec),
      targetDims: DIMS
    };
    await mongo.insert(params);
    if (pgActive) await pg.insert(params);
  };

  console.log('Storing three test vectors...');
  await store('test1', v1, 'Chunk 1');
  await store('test2', v2, 'Chunk 2');
  await store('test3', v3, 'Different');

  console.log('Waiting 30 seconds for MongoDB index to be READY...');
  await new Promise(r => setTimeout(r, 30000));

  console.log('\n--- Searching for vector 2 ---\n');

  const mongoResults = await mongo.vectorSearch({
    queryVector: v2,
    limit: 3,
    minScore: 0,
    aiModelName: MODEL_NAME
  });

  let pgResults = [];
  if (pgActive) {
    pgResults = await pg.vectorSearch({
      queryVector: v2,
      limit: 3,
      minScore: 0,
      aiModelName: MODEL_NAME
    });
  }

  const formatResults = (res) => res.map(r => ({
    text: r.contentDetails[0]?.text || 'unknown',
    score: r.score
  }));

  const mLog = formatResults(mongoResults);
  const pLog = formatResults(pgResults);

  console.log('MongoDB Results:');
  mLog.forEach((r, i) => console.log(`  ${i+1}. ${r.text}: ${r.score.toFixed(6)}`));

  if (pgActive) {
    console.log('\nPostgreSQL Results:');
    pLog.forEach((r, i) => console.log(`  ${i+1}. ${r.text}: ${r.score.toFixed(6)}`));

    console.log('\n--- Comparison ---');
    if (JSON.stringify(mLog.map(r => r.text)) === JSON.stringify(pLog.map(r => r.text))) {
      console.log('✅ Rankings are identical');
    } else {
      console.log('❌ Rankings differ!');
    }

    console.log('\n--- Score Differences ---');
    mLog.forEach((m, i) => {
      const p = pLog.find(x => x.text === m.text);
      const gap = Math.abs(m.score - (p?.score || 0));
      console.log(`${m.text}: Mongo=${m.score.toFixed(6)}, Postgres=${p?.score.toFixed(6)}, Diff=${gap.toFixed(8)}`);
    });
  }

  await mongo.close();
  if (pg.pool) await pg.pool.end();
}

advancedParityDiagnostics().catch(console.error);
