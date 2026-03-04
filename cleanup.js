import 'dotenv/config';
import MongoConnection from './src/core/connection.js';

async function cleanup() {
    await MongoConnection.connect(process.env.MONGODB_URI, 'manasdb_test');
    const db = MongoConnection.getDb();

    const regexFilter = { project: { $regex: '^(e2e_|debug_|quantum_|large_document_|large_random_)' } };

    // Delete ALL e2e_ / debug_ / quantum_ test projects
    const delDocs = await db.collection('_manas_documents').deleteMany(regexFilter);
    const delChunks = await db.collection('_manas_chunks').deleteMany(regexFilter);

    // Delete orphan vectors (whose chunk doc was just deleted)
    const allChunkIds = await db.collection('_manas_chunks').distinct('_id');
    const delV = await db.collection('_manas_vectors').deleteMany({
        chunk_id: { $nin: allChunkIds }
    });

    console.log(`Docs deleted: ${delDocs.deletedCount} | Chunks deleted: ${delChunks.deletedCount} | Orphan vectors: ${delV.deletedCount}`);
    process.exit(0);
}
cleanup();
