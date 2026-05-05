const mongoose = require('mongoose');

// Connecting to the cluster without a db name defaults to 'test'
const MONGODB_URI = 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  console.log('Database Name:', db.databaseName);
  
  const collections = await db.listCollections().toArray();
  console.log('Collections in test:', collections.map(c => c.name));

  if (collections.find(c => c.name === 'bills')) {
    const billsCollection = db.collection('bills');
    const startOfDay = new Date('2026-05-05T00:00:00.000Z');
    const endOfDay = new Date('2026-05-05T23:59:59.999Z');

    const bills = await billsCollection.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 }).toArray();

    console.log(`Found ${bills.length} bills for May 5, 2026 in test database`);
    bills.slice(0, 10).forEach(b => {
      console.log(`ID: ${b._id}, CreatedAt: ${b.createdAt.toISOString()}, Bill#: ${b.billNumber || 'N/A'}`);
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
