import dotenv from 'dotenv';
import { ManasDB } from '../../src/index.js';
import MongoConnection from '../../src/core/connection.js';

dotenv.config();

async function testDynamicDimensions() {
  console.log('=== TEST: DYNAMIC DIMENSION DETECTION ===\n');

  // Test Transformers (384)
  const memory = new ManasDB({
    uri: process.env.MONGODB_URI,
    projectName: 'dynamic_test',
    modelConfig: { source: 'transformers' },
    debug: true
  });

  try {
    console.log('Initializing with Transformers (Local Model)...');
    await memory.init();
    
    console.log(`Detected Dimensions: ${memory.targetDims}`);
    if (memory.targetDims === 384) {
      console.log('Γ£à SUCCESS: Detected 384 dimensions.');
    } else {
      console.log(`Γ¥î FAILURE: Expected 384, got ${memory.targetDims}`);
    }

    // Verify index was created
    const db = (await import('../../src/core/connection.js')).default.getDb();
    const indexes = await db.collection('_manas_vectors').listSearchIndexes().toArray();
    const hasIdx = indexes.some(idx => idx.name === 'vector_index_384');
    
    if (hasIdx) {
      console.log('Γ£à SUCCESS: MongoDB index vector_index_384 found.');
    } else {
      console.log('Γ¥î FAILURE: MongoDB index vector_index_384 NOT found.');
    }

  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await memory.close();
  }
}

testDynamicDimensions();
