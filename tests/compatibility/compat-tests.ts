import { LegacyManasDB } from '../../src/legacy/LegacyManasDB.ts';
import { ManasDB as NewManasDB } from '../../src/index.ts';
import assert from 'assert';

async function runCompatibilityTests() {
  console.log('--- Running Milestone 1A Compatibility Tests ---');
  
  // 1. Initialize Legacy
  const legacyDb = new LegacyManasDB({ projectName: 'compat-test' });
  await legacyDb.init();
  
  // 2. Initialize New (Compatibility Layer)
  const newDb = new NewManasDB({ projectName: 'compat-test' });
  await newDb.init();

  // 3. Execute Absorb on both
  const text = 'The quick brown fox jumps over the lazy dog.';
  
  const legacyResult = await legacyDb.absorb(text);
  const newResult = await newDb.absorb(text);

    // Recursively normalize dynamic IDs and timestamps
  const normalize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      const arr = obj.map(item => normalize(item));
      for (const key of Object.keys(obj)) {
        if (key !== 'length' && !arr.hasOwnProperty(key)) {
          if (key === 'durationMs') { (arr as any)[key] = 0; }
          else if (key === '_trace') { (arr as any)[key] = normalize((obj as any)[key]); }
          else { (arr as any)[key] = normalize((obj as any)[key]); }
        }
      }
      return arr;
    }
    const copy = { ...obj };
    if (copy.contentId !== undefined) copy.contentId = 'STATIC_ID';
    if (copy.documentId !== undefined) copy.documentId = 'STATIC_ID';
    if (copy.durationMs !== undefined) copy.durationMs = 0;
    for (const key of Object.keys(copy)) {
      if (typeof copy[key] === 'object') {
        copy[key] = normalize(copy[key]);
      }
    }
    return copy;
  };
  

  // 4. Assert exact equality
  try {
    assert.deepStrictEqual(normalize(legacyResult), normalize(newResult));
    console.log('✅ absorb() output matches 100%');
  } catch (err) {
    console.error('❌ Mismatch detected in absorb() output!');
    console.error('Legacy:', legacyResult);
    console.error('New:', newResult);
    throw err;
  }

  // 5. Execute Recall on both
  const query = 'fox jumps';
  const legacyRecall = await legacyDb.recall(query);
  const newRecall = await newDb.recall(query);
  if ((legacyRecall as any).durationMs) (legacyRecall as any).durationMs = 0;
  if ((newRecall as any).durationMs) (newRecall as any).durationMs = 0;
  if ((legacyRecall as any)._trace) (legacyRecall as any)._trace = undefined;
  if ((newRecall as any)._trace) (newRecall as any)._trace = undefined;

  try {
    assert.deepStrictEqual(legacyRecall, newRecall);
    console.log('✅ recall() output matches 100%');
  } catch (err) {
    console.error('❌ Mismatch detected in recall() output!');
    console.error('Legacy:', legacyRecall);
    console.error('New:', newRecall);
    throw err;
  }

  // 6. Execute Forget on both
  // Usually this requires a valid ID from the absorb result.
  // We can just use the absorbed document's ID if one exists, or a dummy.
  const idToForget = legacyResult?.[0]?.id || 'test-id-123';
  
  const legacyForget = await legacyDb.delete(idToForget);
  const newForget = await newDb.delete(idToForget);

  try {
    assert.deepStrictEqual(legacyForget, newForget);
    console.log('✅ forget() output matches 100%');
  } catch (err) {
    console.error('❌ Mismatch detected in forget() output!');
    throw err;
  }

  console.log('All compatibility tests passed.');
  
  await legacyDb.close();
  await newDb.close();
}

runCompatibilityTests().catch(console.error);
