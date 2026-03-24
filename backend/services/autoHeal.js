const cron = require('node-cron');
const axios = require('axios');

// Run auto-heal every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('🔄 Running daily auto-heal...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auto-heal');
    console.log('✅ Auto-heal completed:', response.data.message);
  } catch (error) {
    console.error('❌ Auto-heal failed:', error.message);
  }
});

module.exports = cron;