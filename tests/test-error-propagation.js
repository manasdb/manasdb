import { ManasDB } from '../src/index.js';

async function runTest() {
  console.log('--- Testing Error Propagation ---');
  
  // Test 1: Invalid Database URI
  console.log('\n[Test 1] Invalid DB URI');
  const memory1 = new ManasDB({ uri: 'mongodb://invalid-host:27017' });
  try {
    await memory1.init();
    await memory1.absorb('This should fail.');
  } catch (err) {
    console.log('✅ Caught expected DB error:', err.message);
  }

  // Test 2: Invalid Embedding Provider
  console.log('\n[Test 2] Invalid Embedding Source');
  const memory2 = new ManasDB({ 
    modelConfig: { source: 'openai' },
    // We expect this to fail during init because of missing API key, 
    // or during absorb if we mock/bypass init check
  });
  
  // Note: OpenAIProvider throws in constructor if key is missing.
  // Let's test a source that fails during embed.
  
  try {
    const memory3 = new ManasDB({
       databases: [{ type: 'memory' }],
       modelConfig: { source: 'ollama', model: 'non-existent-model' }
    });
    await memory3.init();
    await memory3.absorb('This should fail during embedding.');
  } catch (err) {
    console.log('✅ Caught expected Embedding error:', err.message);
  }

  console.log('\n--- Error Propagation Tests Complete ---');
}

runTest();
