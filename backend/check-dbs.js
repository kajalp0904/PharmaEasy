const mongoose = require('mongoose');

// The URI from .env
const MONGODB_URI = 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/pharmeasy?retryWrites=true&w=majority';
// Without DB name
const MONGODB_URI_TEST = 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/?retryWrites=true&w=majority';

async function checkDb(uri, label) {
  console.log(`\n=== CHECKING DB: ${label} ===`);
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    const db = conn.db;
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      if (col.name === 'bills' || col.name === 'batches' || col.name === 'medicines') {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  ${col.name}: ${count} documents`);
        if (col.name === 'bills' && count > 0) {
          const sample = await db.collection(col.name).find().sort({ createdAt: -1 }).limit(1).toArray();
          console.log(`    Latest bill date: ${sample[0].createdAt}`);
        }
      }
    }
    await conn.close();
  } catch (err) {
    console.error(`Error connecting to ${label}:`, err.message);
  }
}

async function main() {
  await checkDb(MONGODB_URI, 'pharmeasy');
  await checkDb(MONGODB_URI_TEST, 'test');
}

main();
