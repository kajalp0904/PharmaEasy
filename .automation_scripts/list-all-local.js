const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/pharmeasy';

async function listAllLocal() {
    try {
        await mongoose.connect(LOCAL_URI);
        const db = mongoose.connection.db;
        const medicines = await db.collection('medicines').find({}).toArray();
        console.log(JSON.stringify(medicines));
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}

listAllLocal();
