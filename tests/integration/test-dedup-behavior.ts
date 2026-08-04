import { ManasDB } from '../../src/index.ts';

async function testDedup(): Promise<void> {
  console.log('--- Testing MemoryProvider Deduplication ---');
  
  const memory = new ManasDB({ 
    debug: true 
  });
  await memory.init();

  const text = "This is a unique piece of information that should only be stored once.";
  
  console.log('\n[Step 1] First absorb...');
  const res1 = await memory.absorb(text);
  console.log(`Chunks inserted: ${res1.inserted[0].chunksInserted}`);

  console.log('\n[Step 2] Second absorb (Duplicate)...');
  const res2 = await memory.absorb(text);
  console.log(`Chunks inserted: ${res2.inserted[0].chunksInserted}`);
  
  if (res2.inserted[0].chunksInserted === 0 && res2.inserted[0].isDuplicate) {
    console.log('\n✅ Deduplication successful: 0 chunks inserted on second attempt.');
  } else {
    console.error('\n❌ Deduplication failed: Duplicate chunks were inserted.');
    process.exit(1);
  }
}

testDedup().catch(err => {
  console.error(err);
  process.exit(1);
});
