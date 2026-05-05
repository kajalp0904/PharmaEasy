const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('./models/Medicine');

async function findABC() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const medicines = await Medicine.find({ name: /ABC/i });
        console.log(`Found ${medicines.length} medicines matching "ABC":`);
        medicines.forEach(m => console.log(`- "${m.name}" (${m._id})`));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

findABC();
