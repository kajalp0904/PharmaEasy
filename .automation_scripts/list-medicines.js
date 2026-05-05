const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('./models/Medicine');

async function listMedicines() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const medicines = await Medicine.find({});
        console.log('Current medicines:');
        medicines.forEach(m => console.log(`- "${m.name}"`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

listMedicines();
