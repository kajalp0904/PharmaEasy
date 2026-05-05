const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/pharmeasy';

async function listCollections() {
    try {
        await mongoose.connect(LOCAL_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:');
        collections.forEach(c => console.log(`- ${c.name}`));
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}

listCollections();
