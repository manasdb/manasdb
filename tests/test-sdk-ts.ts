import ManasDB from '../src/index.ts';
import assert from 'assert';

console.log('=====================================================');
console.log('RUNNING TYPESCRIPT SDK & ORCHESTRATION TESTS (v0.4.6)');
console.log('=====================================================');

// 1. Instantiation Test
console.log('\n[1/5] Testing ManasDB TypeScript SDK Instantiation...');
const memory = new ManasDB({
  debug: false,
  modelConfig: { source: 'transformers' },
  reasoning: { enabled: true }
});

assert(memory instanceof ManasDB);
console.log('  ✔️ ManasDB instantiated successfully!');

// 2. Initialization Test
console.log('\n[2/5] Testing ManasDB.init()...');
await memory.init();
assert.strictEqual(memory.databaseDrivers.length, 1);
console.log('  ✔️ ManasDB.init() passed!');

// 3. Absorb Test
console.log('\n[3/5] Testing ManasDB.absorb()...');
const absorbRes = await memory.absorb("Artificial Intelligence memory system powered by ManasDB.", {
  metadata: { category: 'ai-test' }
});

assert.strictEqual(absorbRes.chunks > 0, true);
assert(absorbRes.contentId !== undefined);
console.log(`  ✔️ ManasDB.absorb() passed! Inserted ${absorbRes.chunks} chunk(s).`);

// 4. Recall Test
console.log('\n[4/5] Testing ManasDB.recall()...');
const recallRes = await memory.recall("What is ManasDB?");
assert(recallRes.length > 0);
assert(recallRes[0].metadata.matchedChunk.includes('ManasDB'));
console.log(`  ✔️ ManasDB.recall() passed! Top score: ${recallRes[0].score.toFixed(4)}`);

// 5. Reasoning Recall Test
console.log('\n[5/5] Testing ManasDB.reasoningRecall()...');
const reasoningRes = await memory.reasoningRecall("What system is powered by ManasDB?");
assert(reasoningRes.leaves !== undefined);
assert(reasoningRes.leaves.length > 0);
console.log(`  ✔️ ManasDB.reasoningRecall() passed! Leaves retrieved: ${reasoningRes.leaves.length}`);

await memory.close();

console.log('\n=====================================================');
console.log('ALL v0.4.6 TYPESCRIPT SDK TESTS PASSED CLEANLY! ✅');
console.log('=====================================================');
