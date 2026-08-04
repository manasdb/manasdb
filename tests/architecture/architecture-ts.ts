import * as fs from 'fs';
import * as path from 'path';

function checkInvariant(filePath: string, forbiddenStrings: string[], invariantName: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const forbidden of forbiddenStrings) {
    if (content.includes(forbidden)) {
      throw new Error(`Architecture Violation [${invariantName}]: File ${filePath} contains forbidden string "${forbidden}"`);
    }
  }
}

async function runArchitectureTests() {
  console.log('Running Architecture Tests...');

  const srcDir = path.join(import.meta.dirname, '../../src');

  // Invariant 1: Intents cannot access storage directly
  const intentPath = path.join(srcDir, 'runtime', 'execution', 'intent.ts');
  checkInvariant(intentPath, ['import { MongoAdapter }', 'import { PostgresAdapter }'], 'Intents Storage Isolation');

  // Invariant 2: Runtime does not import adapters directly (handled by builder)
  const runtimePath = path.join(srcDir, 'runtime', 'index.ts');
  checkInvariant(runtimePath, ['adapters/mongodb', 'adapters/postgres'], 'Runtime Adapter Isolation');

  // Invariant 3: Runtime is not exported globally as a singleton
  const runtimeIndex = path.join(srcDir, 'runtime', 'index.ts');
  checkInvariant(runtimeIndex, ['export const runtime = new Runtime();'], 'No Global Runtime Singleton');

  // Invariant 4: Pipeline must not import the public SDK facade or namespaces
  // (Pipeline is a Runtime-internal concern — it has no business knowing
  // ManasDB or memory.cognitive/system exist at all.)
  const pipelineIndexPath = path.join(srcDir, 'pipeline', 'index.ts');
  const storageMiddlewarePath = path.join(srcDir, 'pipeline', 'storage-middleware.ts');
  checkInvariant(pipelineIndexPath, ["from '../index.ts'", 'namespaces/'], 'Pipeline SDK Isolation');
  checkInvariant(storageMiddlewarePath, ["from '../index.ts'", 'namespaces/'], 'Pipeline SDK Isolation');

  // Invariant 5: OperationRouter must not access storage or Runtime directly
  // — it only knows the OperationEngine interface both engines implement
  // (see docs/architecture/operation_router.md, "Why it's separate from Runtime").
  const operationRouterPath = path.join(srcDir, 'runtime', 'compatibility', 'index.ts');
  checkInvariant(operationRouterPath, [
    "from '../index.ts'",           // importing Runtime directly
    'StorageProvider',
    'storage/adapters',
  ], 'OperationRouter Storage/Runtime Isolation');

  // Invariant 6: Adapters must not import Runtime
  // (a real violation of this existed until ModuleManifest was moved from
  // src/runtime/registry/ to src/contracts/ModuleManifest.ts — this test
  // exists so that specific regression can't quietly come back.)
  for (const adapter of ['mongodb', 'postgres', 'redis', 'memory']) {
    const adapterPath = path.join(srcDir, 'storage', 'adapters', `${adapter}.ts`);
    checkInvariant(adapterPath, ["'../../runtime/", "'../runtime/"], `Adapter Runtime Isolation (${adapter})`);
  }

  console.log('✅ Architecture Invariants Passed!');
}

runArchitectureTests().catch(err => {
  console.error(err);
  process.exit(1);
});
