import 'dotenv/config';
import { ManasDB } from '../../src/index.ts';

async function main(): Promise<void> {
  console.log('Testing forget, forgetMany, and lambda options...');
  const memory = new ManasDB({
    modelConfig: { source: 'transformers' },
    uri: process.env.MONGODB_URI,
    dbName: 'manasdb_test',
    projectName: 'test_methods_' + Date.now(),
    debug: false
  });

  await memory.init();

  // Test absorb with metadata
  console.log('--- Absorb ---');
  const insertResult = await memory.absorb('Patient A has an extreme allergy to peanuts.', { metadata: { userId: '123', docType: 'medical' } });
  await memory.absorb('Patient B has a mild allergy to pollen.', { metadata: { userId: '124', docType: 'medical' } });
  await memory.absorb('Patient A loves eating almonds.', { metadata: { userId: '123', docType: 'diet' } });

  const idToForget = insertResult.contentId;
  console.log(`Document 1 ID: ${idToForget}`);

  // Test forget(id)
  console.log('--- Forget(id) ---');
  await memory.forget(idToForget);
  const docsAfterForget = await memory.list();
  if (docsAfterForget.length === 2) {
    console.log('✅ forget(id) success. Remaining docs: 2');
  } else {
    console.error('❌ forget(id) failed. Remaining docs:', docsAfterForget.length);
  }

  // Test forgetMany(query)
  console.log('--- ForgetMany(query) ---');
  await memory.forgetMany({ userId: '123' });
  const docsAfterForgetMany = await memory.list();
  if (docsAfterForgetMany.length === 1) {
    console.log('✅ forgetMany(userId: 123) success. Remaining docs: 1');
  } else {
    console.error('❌ forgetMany failed. Remaining docs:', docsAfterForgetMany.length);
  }

  // Reload data for lambda test
  await memory.clearAll();
  await memory.absorb('Apples are a delicious round red fruit.', { metadata: { tag: 'apple' } });
  await memory.absorb('Apples are grown on apple trees in orchards and are commonly red.', { metadata: { tag: 'apple' } });
  await memory.absorb('Oranges are a delicious round orange colored fruit.', { metadata: { tag: 'orange' } });
  await memory.absorb('Bananas are a long yellow delicious fruit.', { metadata: { tag: 'banana' } });

  // Test lambda (no MMR vs MMR)
  console.log('--- Lambda (MMR) ---');
  const resultsNoMMR = await memory.recall('Tell me about delicious fruits', { limit: 3, lambda: 1.0 });
  console.log('Top 3 without MMR (lambda 1.0):');
  console.log(resultsNoMMR.map((r: any) => r.metadata?.matchedChunk || r.text));

  const resultsWithMMR = await memory.recall('Tell me about delicious fruits', { limit: 3, lambda: 0.1 });
  console.log('Top 3 with MMR (lambda 0.1):');
  console.log(resultsWithMMR.map((r: any) => r.metadata?.matchedChunk || r.text));

  if (resultsWithMMR.map((r: any) => r.metadata?.matchedChunk || r.text).some((t: any) => String(t).includes('Bananas'))) {
    console.log('✅ Lambda MMR success!');
  } else {
    console.log('⚠️ Lambda MMR did not change results visually.');
  }

  await memory.close();
  process.exit(0);
}

main().catch(console.error);
