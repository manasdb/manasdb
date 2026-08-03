import { Scheduler } from '../src/runtime/scheduler/index.ts';
import assert from 'assert';

async function runSchedulerTests() {
  console.log('--- Running Scheduler Tests ---');
  
  const scheduler = new Scheduler();
  let runCount = 0;

  scheduler.register('test-job', { intervalMs: 50, runImmediately: true }, async (ctx) => {
    runCount++;
    if (ctx && ctx.name === 'test-context') {
      runCount++; // extra increment to verify context is passed
    }
  });

  scheduler.setContext({ name: 'test-context' });
  scheduler.start();

  // Give it some time to run a few times
  await new Promise(resolve => setTimeout(resolve, 160));
  
  scheduler.stop();

  try {
    assert.ok(runCount >= 4, `Expected runCount to be >= 4, but got ${runCount}`);
    console.log('✅ Scheduler successfully executed background jobs');
  } catch (err) {
    console.error('❌ Scheduler failed to execute background jobs');
    throw err;
  }
}

runSchedulerTests().catch(console.error);
