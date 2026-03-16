import { ManasDB } from '../src/index.js';

async function runTest() {
  console.log('--- Testing Zero-Config Bootstrap ---');
  
  // No config passed
  const memory = new ManasDB({});
  
  try {
    console.log('Initializing...');
    await memory.init();
    
    console.log('Absorbing data...');
    await memory.absorb('The secret code is 12345.', { 
      metadata: { type: 'test' } 
    });
    
    console.log('Recalling data...');
    const result = await memory.recall('What is the secret code?');
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.length > 0 && result[0].text.includes('12345')) {
      console.log('✅ Zero-config test PASSED!');
    } else {
      console.error('❌ Zero-config test FAILED: Unexpected result.');
    }

    await memory.close();
  } catch (err) {
    console.error('❌ Zero-config test FAILED with error:', err.message);
    process.exit(1);
  }
}

runTest();
