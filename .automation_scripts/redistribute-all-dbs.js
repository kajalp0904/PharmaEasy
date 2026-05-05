const mongoose = require('mongoose');

const DB_URIS = [
  'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/pharmeasy?retryWrites=true&w=majority',
  'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/test?retryWrites=true&w=majority'
];

async function processDB(uri) {
  console.log(`\nConnecting to: ${uri}`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const billsCollection = db.collection('bills');

  const startOfDay = new Date('2026-05-05T00:00:00.000Z');
  const endOfDay = new Date('2026-05-05T23:59:59.999Z');

  const bills = await billsCollection.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();

  console.log(`Found ${bills.length} bills in ${db.databaseName} for May 5, 2026`);

  if (bills.length > 0) {
    const startMs = new Date('2026-05-05T03:30:00.000Z').getTime(); // 09:00 AM IST
    const endMs = new Date('2026-05-05T16:30:00.000Z').getTime();   // 10:00 PM IST
    const timeSpan = endMs - startMs;
    const interval = timeSpan / (bills.length > 1 ? bills.length - 1 : 1);

    for (let i = 0; i < bills.length; i++) {
      const bill = bills[i];
      const randomOffset = (Math.random() - 0.5) * 8 * 60 * 1000; // ±4 mins
      const targetMs = startMs + (i * interval) + randomOffset;
      const newDate = new Date(targetMs);

      await billsCollection.updateOne(
        { _id: bill._id },
        { $set: { createdAt: newDate, updatedAt: newDate } }
      );
    }
    console.log(`  ✓ Successfully redistributed ${bills.length} bills in ${db.databaseName}`);
  }
  await conn.close();
}

async function main() {
  for (const uri of DB_URIS) {
    try {
      await processDB(uri);
    } catch (e) {
      console.error(`Error processing ${uri}:`, e.message);
    }
  }
  console.log('\nAll databases processed.');
}

main().catch(console.error);
