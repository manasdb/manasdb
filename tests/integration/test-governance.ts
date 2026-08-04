import ManasDB from '../../src/index.ts';
import chalk from 'chalk';

async function runGovernanceTests(): Promise<void> {
  process.env.OPENAI_API_KEY = 'sk-1234567890abcdef1234567890abcdef'; // Dummy for init
  process.env.GEMINI_API_KEY = 'dummy-gemini';
  
  console.log(chalk.cyan('\n--- Starting ManasDB Governance & Lifecycle Tests (v0.4.2) ---'));

  // 1. Project Isolation Test
  console.log(chalk.yellow('\n[1] Testing Project Isolation...'));
  const alpha = new ManasDB({ projectName: 'project_alpha', debug: false });
  await alpha.init();
  await alpha.absorb("Secret key for Alpha is 12345");

  const beta = new ManasDB({ projectName: 'project_beta', debug: false });
  await beta.init();
  const betaResults = await beta.recall("What is the secret key?", { limit: 1 });
  
  if (betaResults.length === 0) {
    console.log(chalk.green('  ✅ Project Isolation Verified: Beta cannot see Alpha data.'));
  } else {
    console.log(chalk.red('  ❌ Isolation Failure: Beta retrieved Alpha data.'));
  }

  // 2. Budget Cap Test
  console.log(chalk.yellow('\n[2] Testing Budget Cap Enforcement...'));
  const brokeApp = new ManasDB({ 
    projectName: 'budget_test',
    modelConfig: { source: 'openai' },
    retry: { 
       budget: { monthlyLimit: 0 } // Block everything
    },
    debug: true 
  });
  await brokeApp.init();

  try {
    await brokeApp.absorb("This message is too expensive for my budget.");
    console.log(chalk.red('  ❌ Budget Fail: Ingestion should have been blocked.'));
  } catch (err: any) {
    if (err.message.includes('Budget Exceeded')) {
      console.log(chalk.green('  ✅ Budget Cap Enforcement Verified.'));
    } else {
      console.log(chalk.red('  ❌ Unexpected Error: ' + err.message));
    }
  }

  // 3. Model Dimension Lock
  console.log(chalk.yellow('\n[3] Testing Model Dimension Lock...'));
  // Note: This relies on existing data in the provider. 
  // We'll simulate by re-initializing the same project with a "fake" mismatch.
  // In a real test we'd swap providers, but here we'll just check if the logic throws when dims differ.
  
  // 4. Trace Hook Test
  console.log(chalk.yellow('\n[4] Testing onTrace Observability...'));
  let traceReceived = false;
  alpha.onTrace((trace: any) => {
    console.log(chalk.dim(`    (internal) Trace Received! Keys: ${Object.keys(trace || {}).join(', ')}`));
    if (trace && (trace.nodes || trace.query || trace.results)) {
       traceReceived = true;
    }
  });
  await alpha.recall("Verification", { mode: 'qa' });
  if (traceReceived) {
    console.log(chalk.green('  ✅ Trace Hook Verified.'));
  } else {
    console.log(chalk.red('  ❌ Trace Hook Failure.'));
  }

  console.log(chalk.cyan('\n--- Governance Tests Complete ---'));
}

runGovernanceTests().catch(console.error);
