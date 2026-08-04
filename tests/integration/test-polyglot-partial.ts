import { ManasDB } from '../../src/index.ts';

async function testPolyglotPartial(): Promise<void> {
  console.log('--- Testing Polyglot Partial Failure ---');
  
  // 1. Create a mock failing driver
  const failingDriver = {
    type: 'mongodb',
    init: async () => true,
    insert: async () => { throw new Error("Connection Timeout"); },
    health: async () => ({ status: 'error' }),
    close: async () => {}
  };

  // 2. Create a working memory driver
  const workingDriver = {
    type: 'postgres',
    init: async () => true,
    insert: async () => ({ documentId: 'doc_123', chunksInserted: 1 }),
    health: async () => ({ status: 'ok' }),
    close: async () => {}
  };

  const memory = new ManasDB({ 
    databases: [
      { type: 'mongodb', uri: 'mongodb://mock' },
      { type: 'postgres', uri: 'postgres://mock' }
    ],
    debug: true 
  });

  // Inject mocks
  (memory as any).databaseDrivers = [failingDriver, workingDriver];
  (memory as any)._initCalled = true;

  console.log('\n[Step] Absorbing with one failing provider...');
  try {
    const res = await memory.absorb("Test partial failure");
    console.log(`\n✅ Passed: Absorb returned despite partial failure.`);
    console.log(`Results: ${JSON.stringify(res.inserted)}`);
  } catch (err: any) {
    console.error(`\n❌ Failed: Absorb should have handled partial failure if implemented (it currently uses Promise.all which fails fast).`);
    console.error(`Error: ${err.message}`);
  }

  console.log('\n--- Polyglot Partial Test Complete ---');
}

testPolyglotPartial().catch(err => {
  console.error(err);
  process.exit(1);
});
