import { ManasDB } from '../../src/index.ts';

async function testCacheLogic(): Promise<void> {
  console.log('--- Testing ManasDB Cache Tiers ---');
  
  const memory = new ManasDB({ 
    debug: true 
  });
  await memory.init();

  const text = "The capital of France is Paris.";
  
  console.log('\n[Step 1] Initial absorb...');
  await memory.absorb(text);

  console.log('\n[Step 2] Recall (Cache Miss - Initial)...');
  const res1 = await memory.recall("Where is Paris?");
  console.log(`Retrieval Path: ${(res1 as any)._trace?.retrievalPath}`);

  console.log('\n[Step 3] Recall (Cache Hit - Memory LRU)...');
  const res2 = await memory.recall("Where is Paris?");
  console.log(`Cache Hit Status: ${(res2 as any)._trace?.cacheHit}`);
  
  if ((res2 as any)._trace?.cacheHit === 'memory') {
    console.log('\n✅ Passed: Verified Tier 2 Memory LRU Cache hit.');
  } else {
    console.error('\n❌ Failed: Expected Tier 2 Memory LRU Cache hit.');
  }

  console.log('\n--- Cache Logic Tests Complete ---');
}

testCacheLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
