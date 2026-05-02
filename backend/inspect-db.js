const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/pharmeasy?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');

  const db = mongoose.connection.db;

  // List ALL collections
  const collections = await db.listCollections().toArray();
  console.log('=== ALL COLLECTIONS ===');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name}: ${count} documents`);
  }

  // Try to find bills in common collection names
  const possibleNames = ['bills', 'bill', 'invoices', 'invoice', 'transactions', 'sales'];
  console.log('\n=== SEARCHING FOR BILLS ===');
  for (const name of possibleNames) {
    try {
      const count = await db.collection(name).countDocuments();
      if (count > 0) {
        const sample = await db.collection(name).find().sort({ createdAt: -1 }).limit(3).toArray();
        console.log(`\n${name} (${count} docs) - SAMPLE:`);
        for (const s of sample) {
          console.log(`  _id: ${s._id}, createdAt: ${s.createdAt}, billNumber: ${s.billNumber || 'N/A'}`);
          if (s.items) console.log(`  items: ${JSON.stringify(s.items).substring(0, 100)}`);
        }
      }
    } catch(e) {}
  }

  await mongoose.disconnect();
}

main().catch(console.error);
