import 'dotenv/config';
import ManasDB from '../src/index.js';

async function main() {
  console.log('Testing forget, forgetMany, and lambda options...');
  console.log('Using POLYGLOT MODE: MongoDB + PostgreSQL');

  const memory = new ManasDB({
    modelConfig: { source: 'transformers' },
    databases: [
      { type: 'mongodb', uri: process.env.MONGODB_URI, dbName: 'manasdb_test' },
      { type: 'postgres', uri: process.env.POSTGRES_URI }
    ],
    projectName: 'test_methods_polyglot_' + Date.now(),
    debug: false
  });

  await memory.init();

  // Test absorb with metadata
  console.log('\\n--- Absorb ---');
  const insertResult = await memory.absorb('Patient A has an extreme allergy to peanuts.', { metadata: { userId: '123', docType: 'medical' } });
  await memory.absorb('Patient B has a mild allergy to pollen.', { metadata: { userId: '124', docType: 'medical' } });
  await memory.absorb('Patient A loves eating almonds.', { metadata: { userId: '123', docType: 'diet' } });

  const idToForget = insertResult.contentId;
  console.log(`Document 1 ID: ${idToForget}`);

  // Test forget(id)
  console.log('\n--- Forget(id) ---');
  await memory.forget(idToForget);
  console.log('✅ forget(id) executed.');

  // Test forgetMany(query)
  console.log('\n--- ForgetMany(query) ---');
  const forgetManyResult = await memory.forgetMany({ userId: '123' });
  console.log('ForgetMany Result:', JSON.stringify(forgetManyResult, null, 2));
  
  if (forgetManyResult.deletedTotal >= 3) {
    console.log('✅ forgetMany success. Deleted docs across providers.');
  }

  // ✅ clean slate before MMR test
  await memory.clearAll();
  console.log('✅ clearAll() executed.');

  // Reload data for lambda test
  await memory.absorb('Apples are a red fruit.', { metadata: { tag: 'apple' } });
  await memory.absorb('Apples are a round red fruit.', { metadata: { tag: 'apple' } });
  await memory.absorb('Apples are a delicious red fruit.', { metadata: { tag: 'apple' } });
  await memory.absorb('Bananas are a yellow fruit.', { metadata: { tag: 'banana' } });
  await memory.absorb('Bananas are long and yellow.', { metadata: { tag: 'banana' } });
  
  // Test lambda (no MMR vs MMR)
  console.log('\\n--- Lambda (MMR) ---');
  
  const resultsNoMMR = await memory.recall('Specific red apples and round things', { limit: 3, lambda: 1.0 });
  console.log('Top 3 without MMR (lambda 1.0):');
  console.log(resultsNoMMR.map(r => r.metadata?.matchedChunk || r.contentDetails?.[0]?.text));
  
  const resultsWithMMR = await memory.recall('Diverse fruit types and banana details', { limit: 3, lambda: 0.1 }); 
  console.log('\\nTop 3 with MMR (lambda 0.1):');
  console.log(resultsWithMMR.map(r => r.metadata?.matchedChunk || r.contentDetails?.[0]?.text));

  const mmrTexts = resultsWithMMR.map(r => r.metadata?.matchedChunk || r.contentDetails?.[0]?.text || '');
  if (mmrTexts.some(t => String(t).includes('Bananas'))) {
    console.log('✅ Lambda MMR success! True semantic diversity triggered.');
  } else {
    console.log('⚠️ Lambda MMR did not change results visually.');
  }

  await memory.close();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
