import { EventBus } from '../../src/events/index.ts';
import { PipelineEngine, OperationContext } from '../../src/pipeline/index.ts';
import { RuntimeContext, ExecutionContext } from '../../src/runtime/context/index.ts';

async function testEventBus() {
  console.log('--- Testing EventBus ---');
  const bus = new EventBus();
  let received = false;
  bus.subscribe('test', (payload) => {
    received = payload;
  });
  await bus.publish('test', true);
  if (received !== true) throw new Error('EventBus failed');
  console.log('EventBus OK');
}

async function testPipeline() {
  console.log('--- Testing Pipeline ---');
  const engine = new PipelineEngine();
  const ops: string[] = [];
  
  engine.use({
    name: 'first',
    async execute(ctx, next) {
      ops.push('start 1');
      await next();
      ops.push('end 1');
    }
  });

  engine.use({
    name: 'second',
    async execute(ctx, next) {
      ops.push('start 2');
      await next();
      ops.push('end 2');
    }
  });

  const runCtx = new RuntimeContext();
  const execCtx = new ExecutionContext(runCtx);
  const opCtx = new OperationContext(execCtx, { id: 'test', source: 'test', rawContent: {}, timestamp: new Date() });

  await engine.execute(opCtx);
  
  const expected = ['start 1', 'start 2', 'end 2', 'end 1'].join(',');
  if (ops.join(',') !== expected) {
    throw new Error(`Pipeline failed. Expected ${expected}, got ${ops.join(',')}`);
  }
  console.log('Pipeline OK');
}

async function runTests() {
  try {
    await testEventBus();
    await testPipeline();
    console.log('All unit tests passed!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTests();
