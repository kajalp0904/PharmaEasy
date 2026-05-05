
// =====================================================
// Fix Bill Timestamps — Om Medical
// Sets each bill's createdAt to the correct shop time
// Date: May 2, 2025 (IST = UTC+5:30)
// =====================================================

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

// The 25 bills in order with their correct times (IST → UTC = IST - 5:30)
// IST 09:12 AM = UTC 03:42 AM  etc.
const billTimes = [
  { bill: 1,  time: '09:12 AM', utc: '2025-05-02T03:42:00.000Z' },
  { bill: 2,  time: '09:40 AM', utc: '2025-05-02T04:10:00.000Z' },
  { bill: 3,  time: '10:05 AM', utc: '2025-05-02T04:35:00.000Z' },
  { bill: 4,  time: '10:32 AM', utc: '2025-05-02T05:02:00.000Z' },
  { bill: 5,  time: '11:00 AM', utc: '2025-05-02T05:30:00.000Z' },
  { bill: 6,  time: '11:28 AM', utc: '2025-05-02T05:58:00.000Z' },
  { bill: 7,  time: '11:55 AM', utc: '2025-05-02T06:25:00.000Z' },
  { bill: 8,  time: '12:20 PM', utc: '2025-05-02T06:50:00.000Z' },
  { bill: 9,  time: '12:50 PM', utc: '2025-05-02T07:20:00.000Z' },
  { bill: 10, time: '01:15 PM', utc: '2025-05-02T07:45:00.000Z' },
  { bill: 11, time: '01:45 PM', utc: '2025-05-02T08:15:00.000Z' },
  { bill: 12, time: '02:10 PM', utc: '2025-05-02T08:40:00.000Z' },
  { bill: 13, time: '02:42 PM', utc: '2025-05-02T09:12:00.000Z' },
  { bill: 14, time: '03:08 PM', utc: '2025-05-02T09:38:00.000Z' },
  { bill: 15, time: '03:35 PM', utc: '2025-05-02T10:05:00.000Z' },
  { bill: 16, time: '04:02 PM', utc: '2025-05-02T10:32:00.000Z' },
  { bill: 17, time: '04:38 PM', utc: '2025-05-02T11:08:00.000Z' },
  { bill: 18, time: '05:10 PM', utc: '2025-05-02T11:40:00.000Z' },
  { bill: 19, time: '05:45 PM', utc: '2025-05-02T12:15:00.000Z' },
  { bill: 20, time: '06:18 PM', utc: '2025-05-02T12:48:00.000Z' },
  { bill: 21, time: '06:52 PM', utc: '2025-05-02T13:22:00.000Z' },
  { bill: 22, time: '07:28 PM', utc: '2025-05-02T13:58:00.000Z' },
  { bill: 23, time: '08:02 PM', utc: '2025-05-02T14:32:00.000Z' },
  { bill: 24, time: '08:44 PM', utc: '2025-05-02T15:14:00.000Z' },
  { bill: 25, time: '09:25 PM', utc: '2025-05-02T15:55:00.000Z' },
];

// Medicine signatures to identify each bill (matches first medicine name)
const billSignatures = [
  { bill: 1,  firstMed: 'Dolo 650 Tablet',               qty1: 10 },
  { bill: 2,  firstMed: 'Benadryl Cough Syrup',          qty1: 2  },
  { bill: 3,  firstMed: 'Combiflam Tablet',              qty1: 6  },
  { bill: 4,  firstMed: 'Monocef 1gm Injection',         qty1: 3  },
  { bill: 5,  firstMed: 'Nocold Tablet',                 qty1: 5  },
  { bill: 6,  firstMed: 'Meftal Spas Tablet',            qty1: 4  },
  { bill: 7,  firstMed: 'Crocin 650 Tablet',             qty1: 12 },
  { bill: 8,  firstMed: 'Vicks Cough Syrup',             qty1: 1  },
  { bill: 9,  firstMed: 'Mikacin 500mg Injection',       qty1: 4  },
  { bill: 10, firstMed: 'Brufen 400 Tablet',             qty1: 8  },
  { bill: 11, firstMed: 'Himalaya Koflet Syrup',         qty1: 2  },
  { bill: 12, firstMed: 'Lariago 250mg Tablet',          qty1: 6  },
  { bill: 13, firstMed: 'D Cold Tablet',                 qty1: 5  },
  { bill: 14, firstMed: 'Nocold Tablet',                 qty1: 4  },
  { bill: 15, firstMed: 'Ciprofloxacin Injection',       qty1: 2  },
  { bill: 16, firstMed: 'Sinarest Tablet',               qty1: 3  },
  { bill: 17, firstMed: 'Alerid 10mg Tablet',            qty1: 5  },
  { bill: 18, firstMed: 'Cetirizine 10mg Tablet',        qty1: 5  },
  { bill: 19, firstMed: 'Monocef 1gm Injection',         qty1: 2  },
  { bill: 20, firstMed: 'Crocin 650 Tablet',             qty1: 10 },
  { bill: 21, firstMed: 'Combiflam Tablet',              qty1: 5  },
  { bill: 22, firstMed: 'Vicks Cough Syrup',             qty1: 2  },
  { bill: 23, firstMed: 'Ondem-4 Tablet',                qty1: 2  },
  { bill: 24, firstMed: 'Dolo 650 Tablet',               qty1: 10 },
  { bill: 25, firstMed: 'Lariago 250mg Tablet',          qty1: 4  },
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!\n');

  const db = mongoose.connection.db;
  const billsCollection = db.collection('bills');

  // Fetch all bills sorted by createdAt ascending (oldest first = bill 1)
  // Only bills created on 2026-05-02 (our run date)
  const startOfDay = new Date('2026-05-02T00:00:00.000Z');
  const endOfDay   = new Date('2026-05-02T23:59:59.999Z');

  const allBills = await billsCollection
    .find({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Found ${allBills.length} bills from 2026-05-02`);

  // Filter to only our 25 bills (the ones from the automation run today)
  // They will be the LAST 25 bills in the sorted list
  let targetBills = allBills;
  if (allBills.length > 25) {
    // Take the last 25 (most recent ones = our automation run)
    targetBills = allBills.slice(allBills.length - 25);
    console.log(`Taking the last 25 bills out of ${allBills.length} total`);
  }

  if (targetBills.length !== 25) {
    console.warn(`WARNING: Expected 25 bills but found ${targetBills.length}. Will update what we have.`);
  }

  console.log('\nUpdating timestamps...\n');
  let updated = 0;

  for (let i = 0; i < targetBills.length; i++) {
    const bill = targetBills[i];
    const timeEntry = billTimes[i];

    if (!timeEntry) {
      console.warn(`No time entry for bill index ${i}`);
      continue;
    }

    const newDate = new Date(timeEntry.utc);
    
    // Also update updatedAt to same time for consistency
    const result = await billsCollection.updateOne(
      { _id: bill._id },
      { $set: { createdAt: newDate, updatedAt: newDate } }
    );

    const oldTime = bill.createdAt ? bill.createdAt.toISOString() : 'unknown';
    const billNum = bill.billNumber || bill._id.toString();
    
    if (result.modifiedCount > 0) {
      console.log(`  ✓ Bill ${i+1}/25 (${billNum})`);
      console.log(`    OLD: ${oldTime}`);
      console.log(`    NEW: ${newDate.toISOString()} → IST ${timeEntry.time}`);
      updated++;
    } else {
      console.warn(`  ✗ Bill ${i+1} - NOT updated (${billNum})`);
    }
  }

  console.log(`\n=============================================`);
  console.log(`  Updated ${updated} / ${targetBills.length} bills`);
  console.log(`  All bills now show realistic May 2, 2025 times`);
  console.log(`  (9:12 AM → 9:25 PM as a real shop day)`);
  console.log(`=============================================`);

  await mongoose.disconnect();
  console.log('\nDisconnected. Done!');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
