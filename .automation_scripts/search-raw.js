const mongoose = require('mongoose');
require('dotenv').config();

async function searchRaw() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const medicine = await db.collection('medicines').findOne({ name: /abc/i });
        console.log('Found raw:', medicine);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

searchRaw();
