const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/pharmeasy?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  // List all collections to be sure
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  const billsCollection = db.collection('bills');
  
  const startOfDay = new Date('2026-05-05T00:00:00.000Z');
  const endOfDay = new Date('2026-05-05T23:59:59.999Z');

  const bills = await billsCollection.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();

  console.log(`Found ${bills.length} bills for May 5, 2026`);
  bills.forEach(b => {
    console.log(`ID: ${b._id}, CreatedAt: ${b.createdAt.toISOString()}, Bill#: ${b.billNumber || 'N/A'}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
