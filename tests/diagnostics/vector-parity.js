import dotenv from 'dotenv';
import MongoProvider from '../../src/providers/mongodb.js';
import PostgresProvider from '../../src/providers/postgres.js';
import ModelRegistry from '../../src/utils/ModelRegistry.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const POSTGRES_URI = process.env.POSTGRES_URI;
const PROJECT_NAME = 'diagnostic_parity_project';
const MODEL_NAME = 'transformers'; // 384 dims
const DIMS = ModelRegistry.getDimensions(MODEL_NAME) || 384;

async function runParityDiagnostics() {
  console.log('🚀 Starting ManasDB Vector Parity Diagnostics (Dynamic)...\n');
  console.log(`Target Model: ${MODEL_NAME} (${DIMS} dims)`);

  const mongo = new MongoProvider(MONGODB_URI, 'manasdb_diagnostic', PROJECT_NAME, true);
  const pg = new PostgresProvider(POSTGRES_URI, 'manasdb_diagnostic', PROJECT_NAME, true);

  try {
    console.log('Initializing Providers...');
    await mongo.init(DIMS);
    console.log('✅ MongoDB initialized.');

    let pgActive = false;
    try {
      await pg.init(DIMS);
      pgActive = true;
      console.log('✅ PostgreSQL initialized.');
    } catch (e) {
      console.error('❌ PostgreSQL initialization failed:', e.message);
    }

    console.log('\nClearing old diagnostic data...');
    await mongo.clear();
    if (pgActive) await pg.clear();

    const testVector = new Array(DIMS).fill(0).map(() => Math.random());
    
    // --- Step 1: Check Vector Normalization ---
    console.log('\n--- Step 1: Check Vector Normalization ---');
    console.log('Inserting test data (ManasDB will normalize it)...');

    // Mock AI Provider for insertion
    const mockAiProvider = {
      getModelKey: () => MODEL_NAME,
      embed: async (text, dims) => ({
        vector: testVector,
        dims: dims || DIMS,
        model: MODEL_NAME,
        originalDims: dims || DIMS
      })
    };

    const testText = "Diagnostic parity chunk " + Date.now();
    const chunks = [{ text: testText, embedText: testText, chunkIndex: 0 }];

    await mongo.insert({
      rawText: testText,
      filteredText: testText,
      chunks,
      parentTags: { type: 'diagnostic' },
      aiProvider: mockAiProvider,
      targetDims: DIMS
    });
    console.log('✅ MongoDB insert successful.');

    if (pgActive) {
      await pg.insert({
        rawText: testText,
        filteredText: testText,
        chunks,
        parentTags: { type: 'diagnostic' },
        aiProvider: mockAiProvider,
        targetDims: DIMS
      });
      console.log('✅ PostgreSQL insert successful.');
    }

    console.log('Waiting 30 seconds for MongoDB index to be READY...');
    await new Promise(r => setTimeout(r, 30000));

    // --- Step 2: Verification ---
    console.log('\n--- Step 2: Verification ---');

    // Verify MongoDB
    const db = (await import('../../src/core/connection.js')).default.getDb();
    const mongoDoc = await db.collection('_manas_vectors').findOne({ project: PROJECT_NAME });
    if (mongoDoc) {
      const mongoMag = Math.sqrt(mongoDoc.vector.reduce((s, v) => s + v*v, 0));
      console.log(`MongoDB stored vector magnitude: ${mongoMag.toFixed(6)} (Expected: 1.000)`);
      console.log(`MongoDB vector length: ${mongoDoc.vector.length} (Expected: ${DIMS})`);
    }

    // Verify PostgreSQL
    if (pgActive) {
      const pgResult = await pg.pool.query(
        `SELECT vec::text FROM _manas_vectors WHERE project = $1 LIMIT 1`,
        [PROJECT_NAME]
      );
      if (pgResult.rows.length > 0) {
        const pgVec = JSON.parse(pgResult.rows[0].vec);
        const pgMag = Math.sqrt(pgVec.reduce((s, v) => s + v*v, 0));
        console.log(`PostgreSQL stored vector magnitude: ${pgMag.toFixed(6)} (Expected: 1.000)`);
        console.log(`PostgreSQL vector length: ${pgVec.length} (Expected: ${DIMS})`);
      }
    }

    // --- Step 3: Search Parity ---
    console.log('\n--- Step 3: Search Parity ---');
    const mSearch = await mongo.vectorSearch({ queryVector: testVector, limit: 1, aiModelName: MODEL_NAME });
    console.log(`MongoDB Score: ${mSearch[0]?.score.toFixed(8)}`);

    if (pgActive) {
      const pSearch = await pg.vectorSearch({ queryVector: testVector, limit: 1, aiModelName: MODEL_NAME });
      console.log(`Postgres Score: ${pSearch[0]?.score.toFixed(8)}`);
      
      const diff = Math.abs((mSearch[0]?.score || 0) - (pSearch[0]?.score || 0));
      console.log(`Score Difference: ${diff.toFixed(8)}`);
      if (diff < 0.00001) console.log('✅ PERFECT PARITY ACHIEVED');
    }

  } catch (error) {
    console.error('❌ Diagnostics failed:', error);
  } finally {
    await mongo.close();
    if (pg.pool) await pg.pool.end();
  }
}

runParityDiagnostics();
