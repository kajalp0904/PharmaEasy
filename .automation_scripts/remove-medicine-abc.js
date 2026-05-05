const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('./models/Medicine');
const Batch = require('./models/Batch');
const Location = require('./models/Location');

async function removeMedicine() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Case-insensitive search with potential whitespace
        const query = { name: { $regex: /^\s*ABC\s*$/i } };
        const medicines = await Medicine.find(query);

        if (medicines.length === 0) {
            console.log(`No medicine matching "ABC" found.`);
            // List some medicines starting with A just in case
            const similar = await Medicine.find({ name: { $regex: /^A/i } }).limit(10);
            console.log('Medicines starting with A:');
            similar.forEach(m => console.log(`- "${m.name}"`));
            process.exit(0);
        }

        for (const medicine of medicines) {
            const medicineId = medicine._id;
            console.log(`Removing medicine: "${medicine.name}" (${medicineId})`);

            const batches = await Batch.find({ medicine: medicineId });
            console.log(`Found ${batches.length} batches to remove.`);

            for (const batch of batches) {
                if (batch.location) {
                    const location = await Location.findOne({ code: batch.location });
                    if (location) {
                        console.log(`Freeing up location: ${batch.location}`);
                        location.isOccupied = false;
                        location.currentBatch = null;
                        location.medicineName = "";
                        location.batchNumber = "";
                        location.expiryDate = null;
                        location.quantity = 0;
                        await location.save();
                    }
                }
            }

            await Batch.deleteMany({ medicine: medicineId });
            await Medicine.findByIdAndDelete(medicineId);
            console.log(`Successfully removed "${medicine.name}"`);
        }

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

removeMedicine();
