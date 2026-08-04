/**
 * Plugin SDK Contract Test
 *
 * Doesn't just check that src/sdk/plugin-sdk.ts's exports exist (that's
 * a type-checker's job, and tsc already does it) — actually builds one
 * minimal, real subclass/implementation of each extension point from the
 * barrel's exports and exercises it, proving a contributor genuinely can
 * do what the barrel's doc comment claims.
 */
import {
  Middleware,
  OperationContext,
  PipelineEngine,
  MemoryRepository,
  CognitiveIntent,
  SchedulerJob,
  Scheduler,
  FeatureNotImplementedError,
  assertStorageReady,
} from '../../src/sdk/plugin-sdk.ts';
import assert from 'assert';

async function testMiddleware() {
  const engine = new PipelineEngine();
  const calls: string[] = [];

  const myMiddleware: Middleware = {
    name: 'test-middleware',
    async execute(ctx, next) {
      calls.push('before');
      await next();
      calls.push('after');
    },
  };
  engine.use(myMiddleware);

  const ctx = new OperationContext({} as any, {}, {});
  await engine.execute(ctx);

  assert.deepStrictEqual(calls, ['before', 'after']);
  console.log('PASS: a plain object implementing Middleware runs through PipelineEngine.');
}

function testStorageAdapter() {
  // Doesn't need to be a real database for this test — just needs to
  // genuinely implement MemoryRepository's full shape, proving the
  // interface as exported is actually implementable, and that
  // assertStorageReady() correctly accepts a complete implementation.
  class MinimalAdapter implements MemoryRepository {
    async init() {}
    async save() {}
    async findById() { return null; }
    async findSimilar() { return []; }
    async findKeyword() { return []; }
    async delete() {}
    async deleteMany() { return 0; }
    async clear() {}
    async getManifest() { return {}; }
    async updateManifest() {}
    async getMonthlySpend() { return 0; }
    async expireOlderThan() { return 0; }
    async list() { return []; }
  }

  const adapter = new MinimalAdapter();
  assertStorageReady(adapter, 'test'); // should not throw — not flagged __placeholder, every method present
  console.log('PASS: a class implementing MemoryRepository passes assertStorageReady().');

  // And a __placeholder-flagged one should still be rejected, even with
  // every method present — the marker is checked independently of shape.
  class FlaggedAdapter extends MinimalAdapter {
    public readonly __placeholder = true as const;
  }
  assert.throws(() => assertStorageReady(new FlaggedAdapter(), 'test'));
  console.log('PASS: __placeholder = true is still rejected regardless of method completeness.');
}

async function testIntent() {
  class PingIntent extends CognitiveIntent {
    public async execute(): Promise<string> {
      return 'pong';
    }
  }
  const intent = new PingIntent();
  const result = await intent.execute({} as any);
  assert.strictEqual(result, 'pong');
  assert.ok(intent.id, 'CognitiveIntent should assign an id');
  console.log('PASS: a class extending CognitiveIntent runs and gets an id/timestamp for free.');
}

async function testSchedulerJob() {
  let ran = false;
  class PingJob extends SchedulerJob {
    public readonly name = 'ping-job';
    public readonly options = { intervalMs: 1000 };
    public async run(): Promise<void> {
      ran = true;
    }
  }

  const scheduler = new Scheduler();
  new PingJob().registerOn(scheduler);
  scheduler.start();
  await new Promise(resolve => setTimeout(resolve, 20)); // runImmediately isn't set, so wait isn't needed, but give the event loop a tick
  scheduler.stop();

  // registerOn() doesn't set runImmediately, so `ran` isn't expected true
  // here — this test is about registration succeeding without throwing,
  // not about timing. A job that DOES want to run immediately sets
  // `options.runImmediately = true`.
  console.log('PASS: a class extending SchedulerJob registers on a real Scheduler without error.');
}

function testErrors() {
  assert.ok(new FeatureNotImplementedError('x') instanceof Error);
  console.log('PASS: FeatureNotImplementedError is exported and constructible.');
}

async function run() {
  console.log('====================================================');
  console.log('RUNNING PLUGIN SDK CONTRACT TEST');
  console.log('====================================================');

  await testMiddleware();
  testStorageAdapter();
  await testIntent();
  await testSchedulerJob();
  testErrors();

  console.log('====================================================');
  console.log('PLUGIN SDK CONTRACT TEST: ALL PASSED');
  console.log('====================================================');
}

run().catch(err => {
  console.error('PLUGIN SDK CONTRACT TEST FAILED:', err.message);
  process.exit(1);
});
