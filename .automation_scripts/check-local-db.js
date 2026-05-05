const mongoose = require('mongoose');

// Try local DB instead of Atlas
const LOCAL_URI = 'mongodb://127.0.0.1:27017/pharmeasy';

async function checkLocal() {
    try {
        await mongoose.connect(LOCAL_URI);
        console.log('Connected to LOCAL MongoDB');

        const Medicine = mongoose.model('Medicine', new mongoose.Schema({ name: String }));
        const medicines = await Medicine.find({});
        console.log('Local medicines:');
        medicines.forEach(m => console.log(`- "${m.name}"`));

        process.exit(0);
    } catch (e) {
        console.error('Local connection failed:', e.message);
        process.exit(1);
    }
}

checkLocal();
