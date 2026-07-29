import dotenv from 'dotenv';
import MongoConnection from './core/connection.js';

dotenv.config();

/**
 * Script to verify MongoDB connection health.
 */
async function checkHealth(): Promise<void> {
  console.log('--- ManasDB Health Check ---');
  const uri = process.env.MONGODB_URI;
  const dbName = 'admin';

  try {
    await MongoConnection.connect(uri || 'mongodb://localhost:27017', dbName);

    const db = MongoConnection.getDb();
    const result = await db.command({ ping: 1 });

    if (result.ok === 1) {
      console.log('Status: \x1b[32mSUCCESS\x1b[0m - Database is reachable and ping normal.');
    } else {
      console.log('Status: \x1b[33mWARNING\x1b[0m - Ping command returned unexpected result:', result);
    }
  } catch (error: any) {
    console.error('Status: \x1b[31mFAIL\x1b[0m - Could not connect or ping failed.');
    console.error(error?.message);
  } finally {
    await MongoConnection.disconnect();
  }
}

checkHealth();
