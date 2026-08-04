import { ManasDB } from '../../src/index.ts';

async function testMemoryLimits(): Promise<void> {
  console.log('--- Testing MemoryProvider Memory Limits ---');
  
  const memory = new ManasDB({ 
    debug: true 
  });
  await memory.init();

  // Override limit for testing
  const provider = (memory as any).databaseDrivers[0];
  provider.MEMORY_LIMIT = 5; 

  console.log('\n[Step 1] Filling memory...');
  for (let i = 0; i < 6; i++) {
    await memory.absorb(`This is unique text block #${i}`);
  }

  console.log('\n✅ Memory limit test completed. Check console output for ManasDBWarning.');
}

testMemoryLimits().catch(err => {
  console.error(err);
  process.exit(1);
});
