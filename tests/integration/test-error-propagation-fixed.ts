import { ManasDB } from '../../src/index.ts';

async function testErrorPropagationFixed(): Promise<void> {
  console.log('--- Testing Hardened Error Propagation (Fixed) ---');
  
  console.log('\n[Case 1] Invalid MongoDB URI (Connect Failure)');
  const memory1 = new ManasDB({ 
    uri: 'mongodb://invalid-host-name-that-should-fail:27017',
    dbName: 'test',
    retry: { attempts: 1 } // Fast fail for test
  });
  
  try {
    await memory1.init();
    await memory1.absorb('This should fail');
    console.error('❌ Failed: Should have thrown during init/absorb for bad URI');
  } catch (err: any) {
    console.log(`✅ Passed: Caught expected error: ${err.message}`);
  }

  console.log('\n[Case 2] Invalid Embedding Model (Ollama 404)');
  const memory2 = new ManasDB({
    modelConfig: { source: 'ollama', model: 'non-existent-model-' + Date.now() },
    retry: { attempts: 1 }
  });

  try {
    await memory2.init();
    await memory2.absorb('This should fail during embedding');
    console.error('❌ Failed: Should have thrown for bad embedding model');
  } catch (err: any) {
    console.log(`✅ Passed: Caught expected error: ${err.message}`);
  }

  console.log('\n--- Hardened Error Propagation Tests Complete ---');
}

testErrorPropagationFixed().catch(err => {
  console.error(err);
  process.exit(1);
});
