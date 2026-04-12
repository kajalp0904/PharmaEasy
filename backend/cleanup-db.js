const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config({ quiet: true });

async function cleanupDb() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables. Make sure your .env file is present.');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('⚠️  WARNING: You are about to PERMANENTLY DELETE data from the database!');
  console.log('================================================================================');
  console.log('The following operations will be performed:');
  console.log('   🗑️  Delete ALL documents in "medicines" collection (Medicines removed).');
  console.log('   🗑️  Delete ALL documents in "batches" collection (Stock data removed).');
  console.log('   🗑️  Delete ALL documents in "bills" collection (Billing history removed).');
  console.log('   🧹  Modify ALL documents in "locations" collection:');
  console.log('         -> Set isOccupied to false');
  console.log('         -> Remove batch-related fields (currentBatch, medicineName, etc.)');
  console.log('   🛡️  "users" collection will remain COMPLETELY UNTOUCHED.');
  console.log('================================================================================\n');

  rl.question('Are you absolutely sure you want to proceed? Type "YES" to confirm: ', async (answer) => {
    if (answer !== 'YES') {
      console.log('Cleanup aborted. Phew, safely canceled! 😌');
      rl.close();
      process.exit(0);
    }

    try {
      console.log('\nConnecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB successfully.');

      const db = mongoose.connection.db;

      // 1. Delete all medicines
      const medicinesResult = await db.collection('medicines').deleteMany({});
      console.log(`✅ Deleted ${medicinesResult.deletedCount} documents from "medicines".`);

      // 2. Delete all batches
      const batchesResult = await db.collection('batches').deleteMany({});
      console.log(`✅ Deleted ${batchesResult.deletedCount} documents from "batches".`);

      // 3. Delete all bills
      const billsResult = await db.collection('bills').deleteMany({});
      console.log(`✅ Deleted ${billsResult.deletedCount} documents from "bills".`);

      // 4. Update all locations to reset their state
      const locationsResult = await db.collection('locations').updateMany(
        {},
        {
          $set: { isOccupied: false },
          $unset: {
            currentBatch: "",
            medicineName: "",
            batchNumber: "",
            quantity: "",
            expiryDate: ""
          }
        }
      );
      console.log(`✅ Reset ${locationsResult.modifiedCount} documents in "locations".`);
      
      console.log('\n🎉 Database cleanup completed successfully!');
    } catch (err) {
      console.error('\n❌ Database cleanup error:', err);
    } finally {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB.');
      rl.close();
      process.exit(0);
    }
  });
}

cleanupDb();
