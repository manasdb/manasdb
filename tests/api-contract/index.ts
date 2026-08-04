import ManasDB from '../../src/index.ts';

async function runApiContractTests() {
  console.log('Running API Contract Tests...');
  const memory = new ManasDB();

  // Tier 1 methods
  if (typeof memory.init !== 'function') throw new Error('Missing init');
  if (typeof memory.absorb !== 'function') throw new Error('Missing absorb');
  if (typeof memory.recall !== 'function') throw new Error('Missing recall');
  if (typeof memory.update !== 'function') throw new Error('Missing update');
  if (typeof memory.delete !== 'function') throw new Error('Missing delete');
  if (typeof memory.search !== 'function') throw new Error('Missing search');
  if (typeof memory.batchAbsorb !== 'function') throw new Error('Missing batchAbsorb');
  if (typeof memory.export !== 'function') throw new Error('Missing export');
  if (typeof memory.import !== 'function') throw new Error('Missing import');
  
  // Tier 2 methods
  if (typeof memory.clear !== 'function') throw new Error('Missing clear');
  if (typeof memory.migrateTo !== 'function') throw new Error('Missing migrateTo');
  if (typeof memory.getTelemetry !== 'function') throw new Error('Missing getTelemetry');
  if (typeof memory.getStats !== 'function') throw new Error('Missing getStats');
  if (typeof memory.close !== 'function') throw new Error('Missing close');

  // Namespaces
  if (!memory.cognitive) throw new Error('Missing cognitive namespace');
  if (!memory.system) throw new Error('Missing system namespace');

  console.log('? API Contract Tests Passed!');
}

runApiContractTests().catch(console.error);
