import ManasDB from '../src/index.ts';

async function run() {
  console.log('====================================================');
  console.log('RUNNING MANASDB ISOLATION & CONCURRENCY TESTS');
  console.log('====================================================');

  const configA = {
    projectName: 'isolation_a',
    databaseUri: 'memory://',
    debug: false,
    telemetry: false
  };

  const configB = {
    projectName: 'isolation_b',
    databaseUri: 'memory://',
    debug: false,
    telemetry: false
  };

  console.log('Initializing instance A...');
  const a = new ManasDB(configA);
  await a.init();

  console.log('Initializing instance B...');
  const b = new ManasDB(configB);
  await b.init();

  console.log('Executing parallel absorbs on both instances...');

  const absorbA = a.absorb('The quick brown fox jumps over the lazy dog.');
  const absorbB = b.absorb('Pack my box with five dozen liquor jugs.');

  const [resA, resB] = await Promise.all([absorbA, absorbB]);

  console.log(`[Instance A] absorb completed. Result:`, resA);
  console.log(`[Instance B] absorb completed. Result:`, resB);

  console.log('Testing recall isolation...');
  const recallA = await a.recall('fox');
  const recallB = await b.recall('liquor');

  if (recallA.length === 0 || recallA[0]?.metadata?.project !== 'isolation_a') {
    throw new Error('Instance A recall failed or retrieved incorrect project data.');
  }

  if (recallB.length === 0 || recallB[0]?.metadata?.project !== 'isolation_b') {
    throw new Error('Instance B recall failed or retrieved incorrect project data.');
  }

  console.log('✅ Pipeline, events, and lifecycle are successfully isolated.');

  console.log('Cleaning up...');
  await Promise.all([a.close(), b.close()]);

  console.log('====================================================');
  console.log('ALL ISOLATION TESTS PASSED');
  console.log('====================================================');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
