const mongoose = require('mongoose');
require('dotenv').config();

async function listDatabases() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:');
        dbs.databases.forEach(db => console.log(`- ${db.name}`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

listDatabases();
