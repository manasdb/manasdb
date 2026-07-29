import BaseProvider from '../src/providers/base.ts';
import ModelFactory from '../src/core/model-factory.ts';
import TreeIndex from '../src/core/tree-index.ts';
import MongoConnection from '../src/core/connection.ts';
import assert from 'assert';

console.log('=====================================================');
console.log('RUNNING TYPESCRIPT CORE FOUNDATIONS TESTS (v0.4.4)');
console.log('=====================================================');

// 1. BaseProvider Test
console.log('\n[1/4] Testing BaseProvider.ts...');
class TestCustomProvider extends BaseProvider {
  async init() { return; }
}
const providerInst = new TestCustomProvider();
assert(providerInst instanceof BaseProvider);
console.log('  ✔️ BaseProvider interface subclassed successfully!');

// 2. ModelFactory Test
console.log('\n[2/4] Testing ModelFactory.ts...');
const transformersProvider = ModelFactory.getProvider({ source: 'transformers' });
assert(transformersProvider !== null);
const sameProvider = ModelFactory.getProvider({ source: 'transformers' });
assert.strictEqual(transformersProvider, sameProvider); // Singleton check
console.log('  ✔️ ModelFactory singleton caching passed!');

// 3. TreeIndex Test
console.log('\n[3/4] Testing TreeIndex.ts...');
const tree = new TreeIndex();
assert.strictEqual(tree.isBuilt, false);
tree.build([
  { text: 'First paragraph text chunk.', sectionTitle: 'Overview', chunkIndex: 0 },
  { text: 'Second paragraph details here.', sectionTitle: 'Overview', chunkIndex: 1 },
  { text: 'Third paragraph setup guide.', sectionTitle: 'Setup', chunkIndex: 2 }
]);
assert.strictEqual(tree.isBuilt, true);
assert.strictEqual(tree.sectionCount, 2);
assert.strictEqual(tree.leafCount, 3);
const overviewLeaves = tree.getLeaves('section::Overview');
assert.strictEqual(overviewLeaves.length, 2);
console.log('  ✔️ TreeIndex building and section retrieval passed!');

// 4. MongoConnection Test
console.log('\n[4/4] Testing MongoConnection.ts...');
assert.strictEqual(MongoConnection.isConnected(), false);
assert.throws(() => MongoConnection.getDb(), /MANASDB_CONNECTION_ERROR/);
console.log('  ✔️ MongoConnection disconnected safety checks passed!');

console.log('\n=====================================================');
console.log('ALL v0.4.4 TYPESCRIPT CORE TESTS PASSED CLEANLY! ✅');
console.log('=====================================================');
