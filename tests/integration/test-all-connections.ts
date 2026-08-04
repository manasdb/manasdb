import 'dotenv/config';
import chalk from 'chalk';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
import MongoConnection from '../../src/core/connection.ts';
import MongoProvider from '../../src/providers/mongodb.ts';
import PostgresProvider from '../../src/providers/postgres.ts';
import RedisProvider from '../../src/providers/redis.ts';
import OllamaProvider from '../../src/core/providers/ollama.provider.ts';
import TransformersProvider from '../../src/core/providers/transformers.provider.ts';
import { GeminiProvider } from '../../src/core/providers/cloud.provider.ts';

console.log(chalk.cyan("\n====================================================="));
console.log(chalk.bold("  MANASDB CONNECTIONS DIAGNOSTIC MATRIX"));
console.log(chalk.cyan("=====================================================\n"));

async function testMongo() {
  process.stdout.write(chalk.white('1. Testing MongoDB Connection... '));
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.log(chalk.yellow('SKIPPED (MONGODB_URI not set)'));
      return;
    }
    const mongo = new MongoProvider(uri, 'manasdb_health_test', 'health_check');
    await mongo.init();
    const isHealthy = await mongo.health();
    if (isHealthy) {
      console.log(chalk.green('✅ SUCCESS (MongoDB cluster ping OK)'));
    } else {
      console.log(chalk.red('❌ FAILED (Health check returned false)'));
    }
    await mongo.close();
  } catch (err: any) {
    console.log(chalk.red(`❌ FAILED: ${err?.message}`));
  }
}

async function testPostgres() {
  process.stdout.write(chalk.white('2. Testing PostgreSQL Connection... '));
  try {
    const uri = process.env.POSTGRES_URI || process.env.POSTGRESQL_URI || process.env.DATABASE_URL;
    if (!uri) {
      console.log(chalk.yellow('SKIPPED (POSTGRES_URI not set)'));
      return;
    }
    const pg = new PostgresProvider(uri, 'postgres', 'health_check');
    await pg.init();
    const isHealthy = await pg.health();
    if (isHealthy) {
      console.log(chalk.green('✅ SUCCESS (PostgreSQL pool & pgvector OK)'));
    } else {
      console.log(chalk.red('❌ FAILED (Health check returned false)'));
    }
    await pg.close();
  } catch (err: any) {
    console.log(chalk.red(`❌ FAILED: ${err?.message}`));
  }
}

async function testRedis() {
  process.stdout.write(chalk.white('3. Testing Redis Connection... '));
  try {
    const uri = process.env.REDIS_URI || 'redis://localhost:6379';
    const redis = new RedisProvider(uri, 10, 0.90, false);
    await redis.init();
    const isHealthy = await redis.health();
    if (isHealthy) {
      console.log(chalk.green('✅ SUCCESS (Redis ping OK)'));
    } else {
      console.log(chalk.yellow(`⚠️ OFFLINE/UNREACHABLE at ${uri}`));
    }
    await redis.close();
  } catch (err: any) {
    console.log(chalk.yellow(`⚠️ OFFLINE: ${err?.message}`));
  }
}

async function testOllama() {
  process.stdout.write(chalk.white('4. Testing Ollama Local AI Connection... '));
  try {
    const ollama = new OllamaProvider('nomic-embed-text');
    const res = await ollama.embed('connection test');
    if (res.vector && res.vector.length > 0) {
      console.log(chalk.green(`✅ SUCCESS (Ollama returned ${res.vector.length}-dim vector)`));
    } else {
      console.log(chalk.red('❌ FAILED (Vector empty)'));
    }
  } catch (err: any) {
    console.log(chalk.yellow(`⚠️ OFFLINE (Ollama server not running at http://127.0.0.1:11434 - ${err?.message})`));
  }
}

async function testTransformers() {
  process.stdout.write(chalk.white('5. Testing Transformers Local AI Provider... '));
  try {
    const tf = new TransformersProvider();
    const res = await tf.embed('connection test');
    if (res.vector && res.vector.length === 384) {
      console.log(chalk.green(`✅ SUCCESS (Transformers returned ${res.vector.length}-dim vector)`));
    } else {
      console.log(chalk.red('❌ FAILED'));
    }
  } catch (err: any) {
    console.log(chalk.red(`❌ FAILED: ${err?.message}`));
  }
}

async function testGemini() {
  process.stdout.write(chalk.white('6. Testing Gemini Cloud AI Connection... '));
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log(chalk.yellow('SKIPPED (GEMINI_API_KEY not set)'));
      return;
    }
    const gemini = new GeminiProvider();
    const res = await gemini.embed('connection test');
    if (res.vector && res.vector.length > 0) {
      console.log(chalk.green(`✅ SUCCESS (Gemini returned ${res.vector.length}-dim vector)`));
    } else {
      console.log(chalk.red('❌ FAILED'));
    }
  } catch (err: any) {
    console.log(chalk.yellow(`⚠️ FAILED: ${err?.message}`));
  }
}

async function runAllDiagnosticTests() {
  await testMongo();
  await testPostgres();
  await testRedis();
  await testOllama();
  await testTransformers();
  await testGemini();
  console.log(chalk.cyan("\n=====================================================\n"));
}

runAllDiagnosticTests();
