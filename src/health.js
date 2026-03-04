import dotenv from 'dotenv';
import MongoConnection from './core/connection.js';

// Load environment variables from .env file
dotenv.config();

/**
 * Script to verify MongoDB connection health.
 * Reads environment variables, connects to the database, runs a ping command, and prints status.
 */
async function checkHealth() {
  console.log('--- ManasDB Health Check ---');
  const uri = process.env.MONGODB_URI;
  const dbName = 'admin'; // Ping is standardly run on the admin database via driver

  try {
    // 1. Connect using the singleton manager
    await MongoConnection.connect(uri, dbName);

    // 2. Fetch the active db instance and run standard 'ping'
    const db = MongoConnection.getDb();
    const result = await db.command({ ping: 1 });

    // 3. Print success if the ping returned expected ok status
    if (result.ok === 1) {
      console.log('Status: \x1b[32mSUCCESS\x1b[0m - Database is reachable and ping normal.');
    } else {
      console.log('Status: \x1b[33mWARNING\x1b[0m - Ping command returned unexpected result:', result);
    }
  } catch (error) {
    // 4. Print failure along with the error message
    console.error('Status: \x1b[31mFAIL\x1b[0m - Could not connect or ping failed.');
    console.error(error.message);
  } finally {
    // 5. Clean up the connection so the script exits smoothly
    await MongoConnection.disconnect();
  }
}

// Execute the async function immediately
checkHealth();
