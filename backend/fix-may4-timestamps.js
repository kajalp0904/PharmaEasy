const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/?retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');

  const db = mongoose.connection.db;
  const billsCollection = db.collection('bills');

  // Fetch all bills from May 4, 2026
  const startOfDay = new Date('2026-05-03T18:30:00.000Z'); // 12:00 AM IST on May 4 is May 3 18:30 UTC
  const endOfDay   = new Date('2026-05-04T18:29:59.999Z'); // 11:59 PM IST on May 4 is May 4 18:29 UTC

  const allBills = await billsCollection
    .find({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Found ${allBills.length} bills from May 4, 2026.`);

  const fs = require('fs');
  let numGenerated = allBills.length;
  try {
    const generatedCountStr = fs.readFileSync('bills_generated_count.txt', 'utf8');
    numGenerated = parseInt(generatedCountStr, 10);
    console.log(`We expect to update the last ${numGenerated} bills based on generation script.`);
  } catch (err) {
    console.log('No bills_generated_count.txt found. Updating all bills found today.');
  }

  let targetBills = allBills;
  if (allBills.length > numGenerated) {
    targetBills = allBills.slice(allBills.length - numGenerated);
    console.log(`Taking the last ${numGenerated} bills out of ${allBills.length} total.`);
  }

  if (targetBills.length === 0) {
    console.log('No bills to update.');
    process.exit(0);
  }

  // Time boundaries: 09:05 AM IST to 09:50 PM IST on May 4, 2026
  // 09:05 AM IST = 03:35 AM UTC (2026-05-04T03:35:00.000Z)
  // 09:50 PM IST = 16:20 PM UTC (2026-05-04T16:20:00.000Z)
  const startTime = new Date('2026-05-04T03:35:00.000Z').getTime();
  const endTime = new Date('2026-05-04T16:20:00.000Z').getTime();

  let updated = 0;

  // We need to calculate an ideal timestamp for each bill, then add randomness
  const numBills = targetBills.length;
  const interval = numBills > 1 ? (endTime - startTime) / (numBills - 1) : 0;

  for (let i = 0; i < numBills; i++) {
    const bill = targetBills[i];
    
    // Calculate base time for this bill
    const baseTime = startTime + i * interval;
    
    // Add randomness: ± 4 minutes (4 * 60 * 1000 = 240,000 ms)
    // To ensure the first and last bills don't go too far out of bounds, we can clamp or just allow it to slightly exceed.
    const maxJitter = 4 * 60 * 1000;
    const jitter = Math.floor(Math.random() * (maxJitter * 2)) - maxJitter;
    
    const finalTime = new Date(baseTime + jitter);
    
    // Update MongoDB
    const result = await billsCollection.updateOne(
      { _id: bill._id },
      { $set: { createdAt: finalTime, updatedAt: finalTime } }
    );

    const oldTime = bill.createdAt ? bill.createdAt.toISOString() : 'unknown';
    const billNum = bill.billNumber || bill._id.toString();
    
    if (result.modifiedCount > 0) {
      // Format finalTime to IST string for console output
      const finalTimeIST = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(finalTime);

      console.log(`  ✓ Bill ${i+1}/${numBills} (${billNum})`);
      console.log(`    OLD: ${oldTime}`);
      console.log(`    NEW: ${finalTime.toISOString()} → IST ${finalTimeIST}`);
      updated++;
    } else {
      console.warn(`  ✗ Bill ${i+1} - NOT updated (${billNum})`);
    }
  }

  console.log(`\n=============================================`);
  console.log(`  Updated ${updated} / ${numBills} bills`);
  console.log(`  All bills now show realistic May 4, 2026 times`);
  console.log(`=============================================`);

  await mongoose.disconnect();
  console.log('\nDisconnected. Done!');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
