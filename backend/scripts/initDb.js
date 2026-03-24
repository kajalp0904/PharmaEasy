const mongoose = require('mongoose');

/**
 * Database initialization script
 * Verifies collections exist and creates indexes
 */
async function initializeDatabase() {
  try {
    const db = mongoose.connection.db;
    
    console.log('\n📊 Database Initialization Check');
    console.log('================================');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`\n📁 Collections found: ${collectionNames.length}`);
    collectionNames.forEach(name => console.log(`   - ${name}`));
    
    // Check and log indexes for each collection
    console.log('\n🔍 Index Status:');
    
    const expectedCollections = ['medicines', 'batches', 'locations', 'users', 'bills'];
    
    for (const collectionName of expectedCollections) {
      if (collectionNames.includes(collectionName)) {
        const indexes = await db.collection(collectionName).indexes();
        console.log(`\n   ${collectionName}:`);
        indexes.forEach(idx => {
          const keys = Object.keys(idx.key).map(k => `${k}: ${idx.key[k]}`).join(', ');
          const unique = idx.unique ? ' [UNIQUE]' : '';
          console.log(`     - ${idx.name}: { ${keys} }${unique}`);
        });
      } else {
        console.log(`\n   ${collectionName}: ⚠️  Collection not found`);
      }
    }
    
    console.log('\n✅ Database initialization check complete\n');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
}

/**
 * Initialize locations if collection is empty
 */
async function initializeLocations() {
  try {
    const Location = mongoose.model('Location');
    
    const count = await Location.countDocuments();
    
    if (count === 0) {
      console.log('📦 Initializing 100 locations...');
      
      const locations = [];
      
      // Create 20 shelves with 5 rows each (S1-R1 to S20-R5)
      for (let shelf = 1; shelf <= 20; shelf++) {
        for (let row = 1; row <= 5; row++) {
          locations.push({
            code: `S${shelf}-R${row}`,
            isOccupied: false,
            currentBatchId: null,
            medicineName: '',
            batchNumber: '',
            quantity: 0
          });
        }
      }
      
      await Location.insertMany(locations);
      console.log(`✅ Created ${locations.length} locations (S1-R1 to S20-R5)`);
      
    } else {
      console.log(`✅ Locations already initialized (count: ${count})`);
    }
    
  } catch (error) {
    console.error('❌ Location initialization error:', error.message);
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  initializeLocations
};
