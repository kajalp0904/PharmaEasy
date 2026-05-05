const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/pharmeasy';

async function searchLocal() {
    try {
        await mongoose.connect(LOCAL_URI);
        const Medicine = mongoose.model('Medicine', new mongoose.Schema({ name: String }));
        const medicines = await Medicine.find({ name: /abc/i });
        console.log(`Local matches: ${medicines.length}`);
        medicines.forEach(m => console.log(`- "${m.name}"`));
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}

searchLocal();
