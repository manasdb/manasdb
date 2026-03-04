import 'dotenv/config';
import MongoConnection from './src/core/connection.js';
await MongoConnection.connect(process.env.MONGODB_URI, 'manasdb_test');
const db = MongoConnection.getDb();

// Check the most recent recipe project from v6 Ollama run
const recentProject = 'e2e_s1_Recipe_snippet_1772248821441';
console.log('Checking:', recentProject);

const parent = await db.collection('_manas_content').findOne({ project: recentProject, isParent: true });
const children = await db.collection('_manas_content').find({ project: recentProject, isChild: true }).toArray();
console.log('parent:', parent ? 'found' : 'NOT FOUND');
console.log('children:', children.length);

if (children.length > 0) {
  children.forEach(c => console.log('  child text:', c.text?.substring(0,80)));
  const cids = children.map(c => c._id);
  const vecs = await db.collection('_manas_vectors').find({ content_id: { $in: cids } }).toArray();
  console.log('vectors:', vecs.length);
  vecs.forEach(v => console.log('  model:', v.model, 'profile:', v.profile, 'dims:', v.dims));
} else {
  // Try without project filter
  const anyChild = await db.collection('_manas_content').findOne({ isChild: true, text: { $regex: 'Margherita', $options: 'i' }});
  console.log('Any pizza child (no project filter):', anyChild?.project, anyChild?.text?.substring(0,80));
}

process.exit(0);
