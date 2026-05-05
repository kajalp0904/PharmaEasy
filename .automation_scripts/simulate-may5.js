const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function main() {
  const email = 'ommedical@0910';
  const password = 'om@123';
  const baseUrl = 'https://pharmaeasy-a9xk.onrender.com/api';

  console.log('Logging in to PharmaEasy API...');
  const loginRes = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    return;
  }
  const token = loginData.token;
  console.log('Login successful.');

  const popular = ['Dolo 650 Tablet', 'Combiflam Tablet', 'Vicks Cough Syrup'];
  const others = [
    'Cetirizine 10mg Tablet', 'Alerid 10mg Tablet', 'Monocef 1gm Injection', 
    'Mikacin 500mg Injection', 'Ciprofloxacin Injection', 'Crocin 650 Tablet', 
    'Brufen 400 Tablet', 'Meftal Spas Tablet', 'Calpol 500 Tablet', 
    'Benadryl Cough Syrup', 'Dabur Honitus Cough Syrup', 'Ondem-4 Tablet', 
    'Sinarest Tablet', 'Nocold Tablet', 'Lariago 250mg Tablet'
  ];

  const numBills = Math.floor(Math.random() * 6) + 25; // 25 to 30
  console.log(`Generating ${numBills} new mixed bills...`);
  
  let generatedBillsCount = 0;

  for (let i = 0; i < numBills; i++) {
    const numItems = Math.floor(Math.random() * 4) + 1; // 1 to 4 items
    const itemsMap = new Map();

    // Occasional single items, different pairings
    if (Math.random() > 0.4) {
      const popItem = popular[Math.floor(Math.random() * popular.length)];
      itemsMap.set(popItem, Math.floor(Math.random() * 3) + 1);
    }

    while (itemsMap.size < numItems) {
      const med = others[Math.floor(Math.random() * others.length)];
      if (!itemsMap.has(med)) {
        itemsMap.set(med, Math.floor(Math.random() * 4) + 1);
      }
    }

    const items = Array.from(itemsMap, ([medicineName, quantityRequired]) => ({
      medicineName,
      quantityRequired
    }));

    const billPayload = {
      items,
      customerName: `Customer ${Math.floor(Math.random() * 1000)}`,
      paymentMethod: Math.random() > 0.3 ? 'Cash' : 'UPI'
    };

    try {
      const res = await fetch(`${baseUrl}/generate-bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(billPayload)
      });
      const data = await res.json();
      if (data.success) {
        console.log(`  - Bill ${i + 1}/${numBills} created.`);
        generatedBillsCount++;
      } else {
        console.error(`  x Bill ${i + 1}/${numBills} failed:`, data.message);
      }
    } catch (err) {
      console.error(`  x Bill ${i + 1}/${numBills} error:`, err.message);
    }

    // Delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`Finished generating ${generatedBillsCount} bills via API.\n`);

  console.log('Connecting to MongoDB for timestamp redistribution...');
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pharmaeasy_user:ommed123@cluster0.qhbvazk.mongodb.net/pharmeasy?retryWrites=true&w=majority';
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to Database.\n');

  const db = mongoose.connection.db;
  const billsCollection = db.collection('bills');

  // Fetch the latest generated bills
  const targetBills = await billsCollection
    .find()
    .sort({ createdAt: -1 })
    .limit(generatedBillsCount)
    .toArray();
    
  targetBills.reverse(); // old to new

  // Times between 09:15 AM and 09:45 PM IST on May 5, 2026.
  // IST is UTC+5:30.
  // 09:15 AM IST = 03:45 AM UTC
  // 09:45 PM IST = 16:15 PM UTC
  
  const startMs = new Date('2026-05-05T03:45:00.000Z').getTime();
  const endMs = new Date('2026-05-05T16:15:00.000Z').getTime();
  const timeSpan = endMs - startMs;
  
  let updated = 0;

  for (let i = 0; i < targetBills.length; i++) {
    const bill = targetBills[i];
    
    // Distribute evenly, add randomness +/- 3 mins
    const baseTime = startMs + (timeSpan / targetBills.length) * i;
    const randomOffset = (Math.random() - 0.5) * 6 * 60 * 1000;
    const finalTime = new Date(baseTime + randomOffset);

    await billsCollection.updateOne(
      { _id: bill._id },
      { $set: { createdAt: finalTime, updatedAt: finalTime } }
    );
    
    // Format IST time for display (e.g. 09:15 AM)
    const istTime = new Date(finalTime.getTime() + 5.5 * 60 * 60 * 1000);
    let hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strTime = hours.toString().padStart(2, '0') + ':' + minutes + ' ' + ampm;
    
    console.log(`  ✓ Updated Bill ${bill.billNumber || bill._id} to May 5, ${strTime} IST`);
    updated++;
  }

  console.log(`\n=============================================`);
  console.log(`  Successfully redistributed ${updated} bills for May 5.`);
  console.log(`=============================================`);

  await mongoose.disconnect();
}

main().catch(console.error);
