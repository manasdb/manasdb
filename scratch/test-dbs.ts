import 'dotenv/config';
import pg from 'pg';

async function testPgVector() {
  const pool = new pg.Pool({ connectionString: process.env.POSTGRES_URI });
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('CREATE EXTENSION vector succeeded!');
  } catch (e: any) {
    console.log('CREATE EXTENSION vector failed:', e.message);
  } finally {
    await pool.end();
  }
}

testPgVector();
