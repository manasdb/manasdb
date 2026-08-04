import { ManasDB } from '../../src/index.ts';

async function testReasoningTree(): Promise<void> {
  console.log('--- Testing ManasDB Reasoning Tree ---');
  
  const memory = new ManasDB({ 
    reasoning: { enabled: true },
    debug: true 
  });
  await memory.init();

  const complexText = `
# Project Antigravity
This project is an advanced agentic coding assistant designed to solve complex engineering tasks.

## Core Features
1. Multi-step planning.
2. Context-aware code generation.
3. Automated verification and testing.

## Infrastructure
The system runs on a distributed cluster of GPU-accelerated nodes, utilizing both vector and graph indices for retrieval.
`;
  
  console.log('\n[Step 1] Absorbing structured text...');
  await memory.absorb(complexText);

  console.log('\n[Step 2] reasoningRecall (Finding Infrastructure section)...');
  const result = await (memory as any).reasoningRecall("How does the infrastructure work?");
  
  console.log(`Section Identified: ${result.section}`);
  console.log(`Leaves Count: ${result.leaves.length}`);
  console.log(`First Leaf: ${result.leaves[0].text}`);

  if (result.section && result.leaves.length > 0) {
    console.log('\n✅ Passed: Reasoning tree successfully mapped segments to headers.');
  } else {
    console.error('\n❌ Failed: Reasoning tree failed to identify sections/leaves.');
    process.exit(1);
  }

  console.log('\n--- Reasoning Tree Tests Complete ---');
}

testReasoningTree().catch(err => {
  console.error(err);
  process.exit(1);
});
