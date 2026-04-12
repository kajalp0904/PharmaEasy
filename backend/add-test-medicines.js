const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');
const Batch = require('./models/Batch');
const Location = require('./models/Location');
const { generateNextLocationCode } = require('./routes/locationRoutes');
require('dotenv').config({ quiet: true });

const testMedicines = [
  { name: "Augmentin 625mg Tablet", category: "Antibiotic", price: 180, manufacturer: "GSK" },
  { name: "Azithromycin 500mg Tablet", category: "Antibiotic", price: 120, manufacturer: "Generic" },
  { name: "Dolo 650mg Tablet", category: "Painkiller", price: 32, manufacturer: "Micro Labs" },
  { name: "Paracetamol 500mg Tablet", category: "Painkiller", price: 20, manufacturer: "Generic" },
  { name: "Cetirizine 10mg Tablet", category: "Anti-Allergy", price: 25, manufacturer: "Generic" },
  { name: "Levocetirizine 5mg Tablet", category: "Anti-Allergy", price: 45, manufacturer: "Generic" },
  { name: "Montair LC Tablet", category: "Anti-Allergy", price: 150, manufacturer: "Cipla" },
  { name: "Omeprazole 20mg Capsule", category: "Antacid", price: 60, manufacturer: "Generic" },
  { name: "Pantoprazole 40mg Tablet", category: "Antacid", price: 80, manufacturer: "Generic" },
  { name: "Digene Gel", category: "Antacid", price: 100, manufacturer: "Abbott" },
  { name: "Calpol 500mg Suspension", category: "Fever", price: 35, manufacturer: "GSK" },
  { name: "Meftal Spas Tablet", category: "Painkiller", price: 55, manufacturer: "Blue Cross" },
  { name: "Cyclopam Tablet", category: "Antispasmodic", price: 48, manufacturer: "Indoco" },
  { name: "Drotin 40mg Tablet", category: "Antispasmodic", price: 75, manufacturer: "Walter Bushnell" },
  { name: "Ondem 4mg Tablet", category: "Anti-Emetic", price: 65, manufacturer: "Alkem" },
  { name: "Domstal 10mg Tablet", category: "Anti-Emetic", price: 42, manufacturer: "Torrent" },
  { name: "Sinarest Tablet", category: "Anti-Cold", price: 123, manufacturer: "Centaur" },
  { name: "Vicks Action 500 Tablet", category: "Anti-Cold", price: 64, manufacturer: "P&G" },
  { name: "Xyzal 5mg Tablet", category: "Anti-Allergy", price: 165, manufacturer: "Dr Reddy's" },
  { name: "Allegra 120mg Tablet", category: "Anti-Allergy", price: 200, manufacturer: "Sanofi" }
];

async function addTestAlertData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let freeLocs = await Location.find({ isOccupied: false }).sort({ code: 1 });

    for (let i = 0; i < testMedicines.length; i++) {
      const medData = testMedicines[i];
      
      const existing = await Medicine.findOne({ name: medData.name });
      if (existing) {
        console.log(`⏭️ Skipping existing test medicine: ${medData.name}`);
        continue;
      }

      // Minimum stock set to 10
      const medicine = new Medicine({
        name: medData.name,
        price: medData.price,
        minimumStock: 10,
        category: medData.category,
        manufacturer: medData.manufacturer,
        totalStock: 0
      });
      await medicine.save();

      // Dynamic Location Assigning 
      let location;
      if (freeLocs.length > 0) {
        location = freeLocs.shift();
      } else {
        const nextCode = await generateNextLocationCode();
        location = new Location({ code: nextCode, isOccupied: false });
        await location.save();
      }

      // Set quantity between 2 and 8
      const quantity = Math.floor(Math.random() * 7) + 2; 

      // Make 4 of them "expired" (-1 days) and the rest "expiring soon" (5 to 30 days)
      const isExpired = i < 4; 
      const expiryDate = new Date();
      if (isExpired) {
        expiryDate.setDate(expiryDate.getDate() - 1); 
      } else {
        const daysToExpiry = Math.floor(Math.random() * 26) + 5;
        expiryDate.setDate(expiryDate.getDate() + daysToExpiry);
      }

      const batch = new Batch({
        medicine: medicine._id,
        batchNumber: `TEST-ALERT-${Date.now()}-${i}`,
        quantity,
        expiryDate,
        location: location.code,
        price: medicine.price
      });
      await batch.save();

      // Update location
      location.isOccupied = true;
      location.currentBatch = batch._id.toString();
      location.medicineName = medicine.name;
      location.batchNumber = batch.batchNumber;
      location.quantity = quantity;
      location.expiryDate = expiryDate;
      await location.save();

      // Update medicine stock
      medicine.totalStock += quantity;
      await medicine.save();

      const typeLabel = isExpired ? 'EXPIRED' : 'EXPIRING SOON';
      console.log(`➕ Added [${typeLabel} & LOW STOCK] ${medicine.name} (Qty: ${quantity}, Exp: ${expiryDate.toDateString()}) at ${location.code}`);
    }

    console.log(`\n🎉 Finished adding 20 test alert medicines.`);
  } catch (err) {
    console.error('\n❌ Error adding test data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

addTestAlertData();
