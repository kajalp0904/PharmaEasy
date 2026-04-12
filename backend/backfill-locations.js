const mongoose = require('mongoose');
require('dotenv').config({ quiet: true });
const Location = require('./models/Location');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const locs = await Location.find({}, 'code');
        let maxShelf = 0;
        
        // Find max shelf to know bounds
        locs.forEach(loc => {
            const match = loc.code.match(/^S(\d+)-R(\d+)$/);
            if (match) {
                maxShelf = Math.max(maxShelf, parseInt(match[1]));
            }
        });

        if (maxShelf === 0) {
            console.log('No valid S{shelf}-R{rack} locations found. Nothing to backfill.');
            process.exit(0);
        }

        console.log(`Max shelf found: S${maxShelf}. Checking for any missing locations up to S${maxShelf}-R5...`);

        const existingCodes = new Set(locs.map(l => l.code));
        let missingCount = 0;
        
        for (let s = 1; s <= maxShelf; s++) {
            for (let r = 1; r <= 5; r++) {
                const code = `S${s}-R${r}`;
                if (!existingCodes.has(code)) {
                    await Location.create({ code, isOccupied: false });
                    console.log(`➕ Created missing location: ${code}`);
                    missingCount++;
                }
            }
        }
        
        console.log(`\n🎉 Backfill complete. Created ${missingCount} missing locations.`);
    } catch (err) {
        console.error('❌ Error during backfill:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

run();
