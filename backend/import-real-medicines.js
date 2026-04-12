const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const Medicine = require('./models/Medicine');
const Batch = require('./models/Batch');
const Location = require('./models/Location');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmeasy';

async function importData() {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all free locations
    let freeLocs = await Location.find({ isOccupied: false }).sort({ code: 1 });

    let medicineCount = 0;
    let batchCount = 0;

    const medicines = [];
    fs.createReadStream('real-medicines.csv')
        .pipe(csv())
        .on('data', (row) => medicines.push(row))
        .on('end', async () => {
            for (const row of medicines) {
                const name = row.name;
                const price = parseFloat(row.price);
                const category = row.category;
                const manufacturer = row.manufacturer;
                const dosageForm = row.dosageForm;
                const strength = row.strength;

                // Optional: skip duplicates
                const existing = await Medicine.findOne({ name });
                if (existing) {
                    console.log(`⏭️ Skipping duplicate: ${name}`);
                    continue;
                }

                // Create medicine
                const medicine = new Medicine({
                    name,
                    price,
                    minimumStock: 10,
                    category,
                    manufacturer,
                    totalStock: 0
                });
                await medicine.save();
                medicineCount++;

                // Assign a free location (if any left) or create a new one dynamically
                let location;
                if (freeLocs.length > 0) {
                    location = freeLocs.shift();
                } else {
                    try {
                        const { generateNextLocationCode } = require('./routes/locationRoutes');
                        const nextCode = await generateNextLocationCode();
                        location = new Location({
                            code: nextCode,
                            isOccupied: false
                        });
                        await location.save();
                        console.log(`➕ Created new loc dynamically: ${location.code}`);
                    } catch (err) {
                        console.error(`❌ Failed to create dynamic location for ${name}:`, err.message);
                        continue;
                    }
                }

                // Create one batch per medicine (quantity = 100, expiry = 2 years from now)
                const batchNumber = `BATCH-${Date.now()}-${medicineCount}`;
                const quantity = 100;
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 2);

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

                console.log(`✅ Added ${name} (₹${price}) at ${location.code}`);
            }
            console.log(`🎉 Imported ${medicineCount} medicines and ${batchCount} batches.`);
            await mongoose.disconnect();
        });
}

importData();