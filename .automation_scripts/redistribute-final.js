const mongoose = require('mongoose');

// Target the 'test' database explicitly or by omitting the name
const MONGODB_URI = 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to MongoDB (test database)...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const billsCollection = db.collection('bills');

  const startOfDay = new Date('2026-05-05T00:00:00.000Z');
  const endOfDay = new Date('2026-05-05T23:59:59.999Z');

  // Find all bills from today
  const bills = await billsCollection.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ createdAt: 1 }).toArray();

  console.log(`Found ${bills.length} bills to redistribute for May 5, 2026`);

  if (bills.length === 0) {
    console.log('No bills found for today.');
    process.exit(0);
  }

  // Range: 09:00 AM IST to 10:00 PM IST
  // 09:00 AM IST = 03:30 AM UTC
  // 10:00 PM IST = 16:30 PM UTC
  const startMs = new Date('2026-05-05T03:30:00.000Z').getTime();
  const endMs = new Date('2026-05-05T16:30:00.000Z').getTime();
  const timeSpan = endMs - startMs;
  
  const interval = timeSpan / (bills.length > 1 ? bills.length - 1 : 1);

  let updated = 0;

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    
    // Add randomness (± 5 minutes)
    const randomOffset = (Math.random() - 0.5) * 10 * 60 * 1000;
    const targetMs = startMs + (i * interval) + randomOffset;
    const newDate = new Date(targetMs);

    await billsCollection.updateOne(
      { _id: bill._id },
      { $set: { createdAt: newDate, updatedAt: newDate } }
    );
    
    // Convert to IST for logging
    const istTime = new Date(newDate.getTime() + 5.5 * 60 * 60 * 1000);
    const timeStr = istTime.toISOString().substring(11, 16);
    console.log(`  ✓ Bill ${bill._id.toString().slice(-6)} -> May 5, ${timeStr} IST`);
    updated++;
  }

  console.log(`\n=============================================`);
  console.log(`  Successfully redistributed ${updated} bills!`);
  console.log(`  Times now range from ~09:00 AM to ~10:00 PM IST`);
  console.log(`=============================================`);

  await mongoose.disconnect();
}

main().catch(console.error);
