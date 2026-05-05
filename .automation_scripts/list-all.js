const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('./models/Medicine');

async function listAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const medicines = await Medicine.find({}, 'name');
        console.log(JSON.stringify(medicines.map(m => m.name)));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listAll();
