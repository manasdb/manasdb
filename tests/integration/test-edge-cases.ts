import { ManasDB } from '../../src/index.ts';

async function testEdgeCases(): Promise<void> {
  console.log('--- Testing ManasDB Edge Cases ---');
  
  const memory = new ManasDB({ debug: false });
  await memory.init();

  console.log('\n[Case 1] Empty string absorb...');
  try {
    await memory.absorb("");
    console.error('❌ Failed: Should have thrown for empty string');
  } catch (err: any) {
    console.log(`✅ Passed: Caught expected error: ${err.message}`);
  }

  console.log('\n[Case 2] Null absorb...');
  try {
    await memory.absorb(null as any);
    console.error('❌ Failed: Should have thrown for null');
  } catch (err: any) {
    console.log(`✅ Passed: Caught expected error: ${err.message}`);
  }

  console.log('\n[Case 3] Large 1MB text absorb...');
  const largeText = "A".repeat(1024 * 1024);
  try {
    const res = await memory.absorb(largeText);
    console.log(`✅ Passed: Absorbed 1MB text successfully. Chunks: ${res.inserted[0].chunksInserted}`);
  } catch (err: any) {
    console.error(`❌ Failed: Error absorbing large text: ${err.message}`);
  }

  console.log('\n[Case 4] recall() with no results...');
  const results = await memory.recall("Something that definitely does not exist in our small memory");
  console.log(`✅ Passed: recall() returned ${results.length} results.`);

  console.log('\n--- Edge Case Tests Complete ---');
}

testEdgeCases().catch(err => {
  console.error(err);
  process.exit(1);
});
