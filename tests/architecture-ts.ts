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

  const srcDir = path.join(import.meta.dirname, '../src');

  // Invariant 1: Intents cannot access storage directly
  const intentPath = path.join(srcDir, 'runtime', 'execution', 'intent.ts');
  checkInvariant(intentPath, ['import { MongoAdapter }', 'import { PostgresAdapter }'], 'Intents Storage Isolation');

  // Invariant 2: Runtime does not import adapters directly (handled by builder)
  const runtimePath = path.join(srcDir, 'runtime', 'index.ts');
  checkInvariant(runtimePath, ['adapters/mongodb', 'adapters/postgres'], 'Runtime Adapter Isolation');

  // Invariant 3: Runtime is not exported globally as a singleton
  const runtimeIndex = path.join(srcDir, 'runtime', 'index.ts');
  checkInvariant(runtimeIndex, ['export const runtime = new Runtime();'], 'No Global Runtime Singleton');

  console.log('? Architecture Invariants Passed!');
}

runArchitectureTests().catch(console.error);
