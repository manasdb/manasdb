import VectorNormalizer from '../../src/utils/vector.ts';
import TokenCounter from '../../src/utils/TokenCounter.ts';
import ModelRegistry from '../../src/utils/ModelRegistry.ts';
import SearchFormatter from '../../src/utils/SearchFormatter.ts';
import CostCalculator from '../../src/utils/CostCalculator.ts';
import PIIFilter from '../../src/utils/PIIFilter.ts';
import Telemetry from '../../src/utils/Telemetry.ts';
import ProjectRegistry from '../../src/utils/ProjectRegistry.ts';
import assert from 'assert';

console.log('=====================================================');
console.log('RUNNING TYPESCRIPT UTILITY MODULE TESTS (v0.4.3)');
console.log('=====================================================');

// 1. VectorNormalizer Test
console.log('\n[1/8] Testing VectorNormalizer.ts...');
const rawVec = [3, 4];
const normVec = VectorNormalizer.normalize(rawVec);
const mag = VectorNormalizer.getMagnitude(normVec);
assert.strictEqual(Math.round(mag), 1);
assert.strictEqual(VectorNormalizer.isNormalized(normVec), true);
console.log('  ✔️ VectorNormalizer passed! Magnitude:', mag);

// 2. TokenCounter Test
console.log('\n[2/8] Testing TokenCounter.ts...');
const text = "Hello world! This is a test for token counting approximation.";
const tokens = TokenCounter.estimateTokens(text);
const cost = TokenCounter.estimateCost(tokens, 'text-embedding-3-small');
assert(tokens > 0);
assert(cost > 0);
console.log(`  ✔️ TokenCounter passed! Estimated tokens: ${tokens}, cost: $${cost.toFixed(6)}`);

// 3. ModelRegistry Test
console.log('\n[3/8] Testing ModelRegistry.ts...');
assert.strictEqual(ModelRegistry.getDimensions('text-embedding-3-small'), 1536);
assert.strictEqual(ModelRegistry.getDimensions('gemini-embedding-001'), 768);
assert.strictEqual(ModelRegistry.getDimensions('local-minilm'), 384);
console.log('  ✔️ ModelRegistry passed!');

// 4. SearchFormatter Test
console.log('\n[4/8] Testing SearchFormatter.ts...');
const rawResults = [{
  database: 'memory',
  document_id: 'doc_101',
  text: 'Sample text chunk',
  tags: ['test'],
  score: 0.95,
  project: 'demo-app',
  model: 'local-minilm'
}];
const formatted = SearchFormatter.formatRecallResults(rawResults);
assert.strictEqual(formatted.length, 1);
assert.strictEqual(formatted[0].contentId, 'doc_101');
assert.strictEqual(formatted[0].score, 0.95);
console.log('  ✔️ SearchFormatter passed!');

// 5. CostCalculator Test
console.log('\n[5/8] Testing CostCalculator.ts...');
const calcCost = CostCalculator.calculate(1000000, 'openai');
assert.strictEqual(calcCost, 0.02);
const absorbEst = CostCalculator.estimateAbsorbCost('Sample paragraph text', 'text-embedding-3-small');
assert(absorbEst.tokens > 0);
console.log('  ✔️ CostCalculator passed! USD for 1M tokens:', calcCost);

// 6. PIIFilter Test
console.log('\n[6/8] Testing PIIFilter.ts...');
const sensitiveText = "My email is user@example.com and secret key is sk-proj9876543210abcde.";
const redacted = PIIFilter.redact(sensitiveText);
assert.strictEqual(redacted.includes('user@example.com'), false);
assert.strictEqual(redacted.includes('[EMAIL]'), true);
assert.strictEqual(redacted.includes('[SECRET]'), true);
console.log('  ✔️ PIIFilter passed! Redacted text:', redacted);

// 7. Telemetry Test
console.log('\n[7/8] Testing Telemetry.ts...');
const timer = Telemetry.startTimer();
const elapsed = Telemetry.endTimer(timer);
assert(elapsed >= 0);
console.log(`  ✔️ Telemetry passed! Timer elapsed: ${elapsed.toFixed(3)}ms`);

// 8. ProjectRegistry Test
console.log('\n[8/8] Testing ProjectRegistry.ts...');
const registry = new ProjectRegistry();
assert(registry instanceof ProjectRegistry);
console.log('  ✔️ ProjectRegistry instantiated successfully!');

console.log('\n=====================================================');
console.log('ALL v0.4.3 TYPESCRIPT UTILITY TESTS PASSED CLEANLY! ✅');
console.log('=====================================================');
