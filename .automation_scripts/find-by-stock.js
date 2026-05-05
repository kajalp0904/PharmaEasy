const mongoose = require('mongoose');
require('dotenv').config();

const Medicine = require('./models/Medicine');

async function findByStock() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const meds = await Medicine.find({ totalStock: 4 });
        console.log('Atlas meds with stock 4:');
        meds.forEach(m => console.log(`- "${m.name}" (${m._id})`));
        
        await mongoose.disconnect();
        
        await mongoose.connect('mongodb://127.0.0.1:27017/pharmeasy');
        const db = mongoose.connection.db;
        const localMeds = await db.collection('medicines').find({ totalStock: 4 }).toArray();
        console.log('Local meds with stock 4:');
        localMeds.forEach(m => console.log(`- "${m.name}"`));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findByStock();
