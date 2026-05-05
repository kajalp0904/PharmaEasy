const mongoose = require('mongoose');

async function main() {
  const MONGODB_URI = "mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/?retryWrites=true&w=majority";
  await mongoose.connect(MONGODB_URI); 

  const billSchema = new mongoose.Schema({}, { strict: false });
  // Make sure collection name is 'bills'
  const Bill = mongoose.model('Bill', billSchema, 'bills');

  // Find bills created in the last 30 minutes
  const recentTime = new Date(Date.now() - 30 * 60 * 1000);
  const bills = await Bill.find({ createdAt: { $gte: recentTime } }).sort({ createdAt: 1 });

  console.log(`Found ${bills.length} recent bills.`);

  if (bills.length === 0) {
    console.log("No recent bills found.");
    process.exit(0);
  }

  // Time range: May 3, 2026 09:15 AM to 09:45 PM IST
  const startTimeIST = new Date('2026-05-03T09:15:00+05:30').getTime();
  const endTimeIST = new Date('2026-05-03T21:45:00+05:30').getTime();
  const totalDuration = endTimeIST - startTimeIST;
  
  const step = totalDuration / (bills.length > 1 ? bills.length - 1 : 1);

  for (let i = 0; i < bills.length; i++) {
    // Expected time
    let expectedTime = startTimeIST + step * i;
    
    // Add randomness ± 3 minutes (180000 ms)
    const randomOffset = (Math.random() * 360000) - 180000;
    
    let finalTime = expectedTime + randomOffset;
    if (finalTime < startTimeIST) finalTime = startTimeIST;
    if (finalTime > endTimeIST) finalTime = endTimeIST;

    const newDate = new Date(finalTime);

    // Update DB
    await Bill.updateOne(
      { _id: bills[i]._id },
      { 
        $set: { 
          createdAt: newDate, 
          updatedAt: newDate 
        } 
      }
    );
    
    const doc = await Bill.findOne({ _id: bills[i]._id });
    console.log(`Updated bill ${doc.get('billNumber')} to ${newDate.toISOString()} (IST: ${newDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
  }

  console.log("Timestamps redistributed successfully.");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
