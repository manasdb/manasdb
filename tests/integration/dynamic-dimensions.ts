import dotenv from 'dotenv';
import { ManasDB } from '../../src/index.ts';
import MongoConnection from '../../src/core/connection.ts';

dotenv.config();

async function testDynamicDimensions(): Promise<void> {
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
    
    console.log(`Detected Dimensions: ${(memory as any).targetDims}`);
    if ((memory as any).targetDims === 384) {
      console.log('✅ SUCCESS: Detected 384 dimensions.');
    } else {
      console.log(`❌ FAILURE: Expected 384, got ${(memory as any).targetDims}`);
    }

    // Verify index was created
    const db = (await import('../../src/core/connection.ts')).default.getDb();
    const indexes = await db.collection('_manas_vectors').listSearchIndexes().toArray();
    const hasIdx = indexes.some((idx: any) => idx.name === 'vector_index_384');
    
    if (hasIdx) {
      console.log('✅ SUCCESS: MongoDB index vector_index_384 found.');
    } else {
      console.log('❌ FAILURE: MongoDB index vector_index_384 NOT found.');
    }

  } catch (e) {
    console.error('Test failed:', e);
  } finally {
    await memory.close();
  }
}

testDynamicDimensions();
