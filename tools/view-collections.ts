/**
 * ManasDB Collection/Table Viewer
 * Prints a summary of all data stored by ManasDB across MongoDB and PostgreSQL.
 * 
 * Usage: node tools/view-collections.ts
 */
import 'dotenv/config';
import MongoConnection from '../src/core/connection.ts';
import { Pool } from 'pg';

const MONGO_URI  = process.env.MONGODB_URI!;
const PG_URI     = process.env.POSTGRES_URI!;
const MONGO_DB   = process.env.MONGODB_DB_NAME || 'manasdb_test';

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  dim:    '\x1b[2m',
  magenta:'\x1b[35m',
};
const hr  = () => console.log(C.dim + '─'.repeat(60) + C.reset);
const hdr = (title: string) => {
  console.log('');
  console.log(C.bold + C.cyan + '══ ' + title + ' ══' + C.reset);
};

// ─── MongoDB ──────────────────────────────────────────────────────────────────
async function viewMongo() {
  hdr('MONGODB ATLAS  ·  ' + MONGO_DB);

  await MongoConnection.connect(MONGO_URI, MONGO_DB);
  const db = MongoConnection.getDb();

  const COLLECTIONS = ['_manas_documents', '_manas_chunks', '_manas_vectors', '_manas_telemetry'];

  for (const name of COLLECTIONS) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    console.log(`\n  ${C.yellow}${name}${C.reset}  →  ${C.bold}${count}${C.reset} documents`);

    if (count === 0) { console.log(`  ${C.dim}  (empty)${C.reset}`); continue; }

    // Show the 3 most recent docs (exclude the raw vector field for readability)
    const docs = await col.find({}, { projection: { vector: 0, vec: 0 } })
                          .sort({ _id: -1 })
                          .limit(3)
                          .toArray();

    docs.forEach((doc: any, i: number) => {
      const preview = JSON.stringify(doc, null, 2)
        .split('\n').slice(0, 8).join('\n'); // cap at 8 lines
      console.log(C.dim + `  [${i + 1}] ` + preview + (preview.includes('\n') ? '\n  ...' : '') + C.reset);
    });

    // List distinct projects stored in this collection
    if (['_manas_documents', '_manas_chunks', '_manas_vectors'].includes(name)) {
      const projects: string[] = await col.distinct('project');
      if (projects.length > 0) {
        console.log(`  ${C.green}  Projects: ${projects.join(', ')}${C.reset}`);
      }
    }
  }

  // Search indexes
  try {
    const vectorCol = db.collection('_manas_vectors');
    const indexes = await vectorCol.listSearchIndexes().toArray();
    if (indexes.length > 0) {
      console.log(`\n  ${C.magenta}Vector Indexes on _manas_vectors:${C.reset}`);
      indexes.forEach((idx: any) => {
        const status = idx.status || idx.queryable ? C.green + '✅ ready' : C.yellow + '⏳ building';
        console.log(`    • ${idx.name}  ${status}${C.reset}`);
      });
    }
  } catch (_) {}

  // Close the underlying mongo client
  try { await (MongoConnection as any)._client?.close(); } catch (_) {}
  console.log(`\n  ${C.green}✅ MongoDB scan complete${C.reset}`);
}

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
async function viewPostgres() {
  if (!PG_URI) {
    console.log(`\n  ${C.dim}POSTGRES_URI not set — skipping.${C.reset}`);
    return;
  }

  hdr('POSTGRESQL  ·  (pgvector)');

  const pool = new Pool({ connectionString: PG_URI });

  const TABLES = ['_manas_documents', '_manas_chunks', '_manas_vectors', '_manas_telemetry'];

  for (const tbl of TABLES) {
    try {
      const { rows: [{ count }] } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tbl}`);
      console.log(`\n  ${C.yellow}${tbl}${C.reset}  →  ${C.bold}${count}${C.reset} rows`);

      if (count === 0) { console.log(`  ${C.dim}  (empty)${C.reset}`); continue; }

      // Peek at 3 newest rows (exclude vector columns)
      let cols = '*';
      if (tbl === '_manas_vectors') cols = 'id, chunk_id, project, embedding_hash, magnitude, model, created_at';

      const { rows } = await pool.query(`SELECT ${cols} FROM ${tbl} ORDER BY id DESC LIMIT 3`);
      rows.forEach((row: any, i: number) => {
        const preview = JSON.stringify(row, null, 2)
          .split('\n').slice(0, 8).join('\n');
        console.log(C.dim + `  [${i + 1}] ` + preview + C.reset);
      });

      // Distinct projects
      if (['_manas_documents', '_manas_chunks', '_manas_vectors'].includes(tbl)) {
        const { rows: pRows } = await pool.query(`SELECT DISTINCT project FROM ${tbl} LIMIT 20`);
        const projects = pRows.map((r: any) => r.project);
        if (projects.length > 0) {
          console.log(`  ${C.green}  Projects: ${projects.join(', ')}${C.reset}`);
        }
      }

    } catch (err: any) {
      if (err.message.includes('does not exist')) {
        console.log(`\n  ${C.dim}${tbl}  →  (table not yet created)${C.reset}`);
      } else {
        console.log(`\n  ${C.red}${tbl}  →  ERROR: ${err.message}${C.reset}`);
      }
    }
  }

  // List pgvector indexes
  try {
    const { rows } = await pool.query(`
      SELECT indexname, tablename FROM pg_indexes
      WHERE tablename = '_manas_vectors'
      ORDER BY indexname
    `);
    if (rows.length > 0) {
      console.log(`\n  ${C.magenta}Indexes on _manas_vectors:${C.reset}`);
      rows.forEach((r: any) => console.log(`    • ${r.indexname}`));
    }
  } catch (_) {}

  await pool.end();
  console.log(`\n  ${C.green}✅ PostgreSQL scan complete${C.reset}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(C.bold + C.cyan + '╔══════════════════════════════════════════════════╗' + C.reset);
  console.log(C.bold + C.cyan + '║    MANASDB  —  Storage Viewer                   ║' + C.reset);
  console.log(C.bold + C.cyan + '╚══════════════════════════════════════════════════╝' + C.reset);

  try {
    await viewMongo();
  } catch (err: any) {
    console.log(C.red + `\n  ❌ MongoDB error: ${err.message}` + C.reset);
  }

  hr();

  try {
    await viewPostgres();
  } catch (err: any) {
    console.log(C.red + `\n  ❌ PostgreSQL error: ${err.message}` + C.reset);
  }

  console.log('');
}

main().catch(console.error);
