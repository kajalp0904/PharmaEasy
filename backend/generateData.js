const mongoose = require('mongoose');
const Medicine = require('./models/Medicine');
const Batch = require('./models/Batch');
const Location = require('./models/Location');
const Bill = require('./models/Bill');

// MongoDB connection string (uses your .env or default)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmeasy';

// ========== UTILITIES ==========
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Base names, strengths, dosage forms, categories, manufacturers
const baseNames = [
  'Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Cetirizine', 'Metformin',
  'Omeprazole', 'Aspirin', 'Azithromycin', 'Losartan', 'Atorvastatin',
  'Amoxiclav', 'Ciprofloxacin', 'Doxycycline', 'Levocetirizine', 'Montelukast',
  'Salbutamol', 'Prednisolone', 'Vitamin D3', 'Calcium', 'Folic Acid',
  'Metoprolol', 'Amlodipine', 'Hydrochlorothiazide', 'Gabapentin', 'Tramadol'
];

const strengths = ['250mg', '500mg', '750mg', '100mg', '200mg', '400mg', '10mg', '20mg', '40mg', '5mg'];
const dosageForms = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Cream', 'Drops', 'Inhaler'];
const categories = [
  'Painkiller', 'Antibiotic', 'Antihistamine', 'Antidiabetic', 'Antacid',
  'Antiplatelet', 'Cholesterol', 'Antihypertensive', 'Anti‑inflammatory', 'Vitamin'
];
const manufacturers = [
  'Cipla', 'Sun Pharma', 'GSK', 'Pfizer', 'Novartis', 'Abbott', 'Sanofi', 'Bayer', 'AstraZeneca', 'USV'
];

// Price mapping by category (realistic Indian prices)
const priceByCategory = {
  'Painkiller': 20, 'Antibiotic': 80, 'Antihistamine': 100, 'Antidiabetic': 50,
  'Antacid': 30, 'Antiplatelet': 15, 'Cholesterol': 70, 'Antihypertensive': 60,
  'Anti‑inflammatory': 40, 'Vitamin': 25
};

function getPrice(category) {
  return priceByCategory[category] || randomInt(20, 100);
}

// ========== MAIN ==========
async function generateData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Ensure locations exist
    let locations = await Location.find().sort({ code: 1 });
    if (locations.length === 0) {
      console.log('📦 Creating 100 locations...');
      const locs = [];
      for (let shelf = 1; shelf <= 20; shelf++) {
        for (let rack = 1; rack <= 5; rack++) {
          locs.push({ code: `S${shelf}-R${rack}`, isOccupied: false });
        }
      }
      await Location.insertMany(locs);
      locations = await Location.find().sort({ code: 1 });
      console.log('✅ 100 locations created.');
    } else {
      console.log(`📍 ${locations.length} locations already exist.`);
    }

    // 2. Clear existing medicines and batches (optional – uncomment if you want a fresh start)
    // await Medicine.deleteMany({});
    // await Batch.deleteMany({});
    // console.log('🗑️  Cleared existing medicines and batches.');

    // 3. Generate 2000 medicines
    const totalMedicines = 2000;
    let medicineCount = 0;
    let batchCount = 0;

    // Get free locations (initially all are free)
    let freeLocs = locations.filter(loc => !loc.isOccupied);
    if (freeLocs.length === 0) {
      console.log('❌ No free locations. Please run init-locations first.');
      process.exit(1);
    }

    for (let i = 0; i < totalMedicines; i++) {
      // Generate random attributes
      const base = baseNames[Math.floor(Math.random() * baseNames.length)];
      const strength = strengths[Math.floor(Math.random() * strengths.length)];
      const dosage = dosageForms[Math.floor(Math.random() * dosageForms.length)];
      const name = `${base} ${strength} ${dosage}`;
      const category = categories[Math.floor(Math.random() * categories.length)];
      const price = getPrice(category);
      const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];

      // Check if medicine already exists (very unlikely but avoid duplicates)
      const existing = await Medicine.findOne({ name });
      if (existing) {
        console.log(`⏭️  Skipping duplicate: ${name}`);
        continue;
      }

      // Create medicine
      const medicine = new Medicine({
        name,
        price,
        minimumStock: randomInt(5, 20),
        category,
        manufacturer,
        totalStock: 0
      });
      await medicine.save();
      medicineCount++;

      // Assign a free location
      if (freeLocs.length === 0) {
        console.log('⚠️  No free locations left. Stopping batch creation.');
        break;
      }
      const location = freeLocs.shift();

      // Generate batch
      const batchNumber = `BATCH-${Date.now()}-${medicineCount}`;
      const quantity = randomInt(50, 500);
      const expiryDate = randomDate(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 3)));

      const batch = new Batch({
        medicine: medicine._id,
        batchNumber,
        quantity,
        expiryDate,
        location: location.code,
        price: medicine.price
      });
      await batch.save();
      batchCount++;

      // Update location
      location.isOccupied = true;
      location.currentBatch = batch._id;
      location.medicineName = medicine.name;
      location.batchNumber = batchNumber;
      location.quantity = quantity;
      location.expiryDate = expiryDate;
      await location.save();

      // Update medicine stock
      medicine.totalStock += quantity;
      await medicine.save();

      if (medicineCount % 100 === 0) {
        console.log(`✅ ${medicineCount} medicines inserted...`);
      }
    }

    console.log(`🎉 Inserted ${medicineCount} medicines and ${batchCount} batches.`);

    // 4. Create sample bills (optional)
    const medicinesWithStock = await Medicine.find({ totalStock: { $gt: 0 } }).limit(50);
    if (medicinesWithStock.length > 0) {
      console.log('📄 Creating 10 sample bills...');
      let billsCreated = 0;
      for (let i = 0; i < 10; i++) {
        const items = [];
        let total = 0;
        const numItems = randomInt(1, 4);
        const shuffled = [...medicinesWithStock].sort(() => 0.5 - Math.random());
        for (let j = 0; j < numItems; j++) {
          const medicine = shuffled[j % shuffled.length];
          // Get a batch of this medicine (any)
          const batch = await Batch.findOne({ medicine: medicine._id, quantity: { $gt: 0 } });
          if (!batch) continue;
          const qty = randomInt(1, Math.min(5, batch.quantity));
          const amount = qty * batch.price;
          total += amount;
          items.push({
            medicineName: medicine.name,
            batchNumber: batch.batchNumber,
            quantitySold: qty,
            price: amount
          });
          // Simulate sale: reduce batch quantity
          batch.quantity -= qty;
          if (batch.quantity === 0) {
            const loc = await Location.findOne({ code: batch.location });
            if (loc) {
              loc.isOccupied = false;
              loc.currentBatch = null;
              loc.medicineName = null;
              loc.batchNumber = null;
              loc.quantity = null;
              loc.expiryDate = null;
              await loc.save();
            }
          }
          await batch.save();
          // Update medicine stock
          medicine.totalStock -= qty;
          await medicine.save();
        }
        if (items.length === 0) continue;
        const bill = new Bill({
          billNumber: `BILL-${Date.now()}-${i}`,
          customerName: `Customer ${i+1}`,
          items,
          totalAmount: total,
          paymentMethod: 'Cash'
        });
        await bill.save();
        billsCreated++;
      }
      console.log(`✅ Created ${billsCreated} sample bills.`);
    }

    console.log('🎉 Data generation complete!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected.');
  }
}

generateData();