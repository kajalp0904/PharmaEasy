const mongoose = require('mongoose');

// Use the test database since that's where Render is writing
const MONGODB_URI = 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');

  const db = mongoose.connection.db;
  const billsCollection = db.collection('bills');

  // Find all bills from either 2025-05-02 (the ones we just modified)
  // or 2026-05-02 (the ones created at 8pm)
  const allBills = await billsCollection.find({
    $or: [
      { createdAt: { $gte: new Date('2025-05-02T00:00:00.000Z'), $lte: new Date('2025-05-03T00:00:00.000Z') } },
      { createdAt: { $gte: new Date('2026-05-02T00:00:00.000Z'), $lte: new Date('2026-05-03T00:00:00.000Z') } }
    ]
  }).sort({ _id: 1 }).toArray();

  console.log(`Found ${allBills.length} total bills to redistribute.`);

  if (allBills.length === 0) {
    console.log('No bills found.');
    process.exit(0);
  }

  // We want to spread them from 09:05 AM IST to 09:45 PM IST on May 2, 2026.
  // IST is UTC+5:30.
  // 09:05 AM IST = 03:35 AM UTC
  // 09:45 PM IST = 04:15 PM UTC (16:15)
  const startMs = new Date('2026-05-02T03:35:00.000Z').getTime();
  const endMs = new Date('2026-05-02T16:15:00.000Z').getTime();
  const timeSpan = endMs - startMs;
  
  // Calculate the average interval between bills
  const interval = timeSpan / (allBills.length > 1 ? allBills.length - 1 : 1);

  let updated = 0;

  for (let i = 0; i < allBills.length; i++) {
    const bill = allBills[i];
    
    // Add a little randomness (± 3 minutes) so it looks completely natural
    const randomOffset = (Math.random() - 0.5) * 6 * 60 * 1000; 
    const targetMs = startMs + (i * interval) + randomOffset;
    
    const newDate = new Date(targetMs);

    const result = await billsCollection.updateOne(
      { _id: bill._id },
      { $set: { createdAt: newDate, updatedAt: newDate } }
    );

    if (result.modifiedCount > 0) {
      updated++;
    }
  }

  console.log(`\n=============================================`);
  console.log(`  Successfully redistributed ${updated} bills!`);
  console.log(`  Dates are now all May 2, 2026`);
  console.log(`  Times range evenly from ~9:00 AM to ~9:50 PM`);
  console.log(`=============================================`);

  await mongoose.disconnect();
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
