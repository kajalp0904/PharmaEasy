const fs = require('fs');

async function main() {
  const email = 'ommedical@0910';
  const password = 'om@123';
  const baseUrl = 'https://pharmaeasy-a9xk.onrender.com/api';

  console.log('Logging in...');
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
  console.log('Logged in successfully. Token received.');

  const antiAllergy = ['Cetirizine 10mg Tablet', 'Alerid 10mg Tablet', 'Allegra 120mg Tablet', 'Xyzal 5mg Tablet'];
  const injections = ['Monocef 1gm Injection', 'Mikacin 500mg Injection', 'Ciprofloxacin Injection'];
  const painkillers = ['Dolo 650 Tablet', 'Combiflam Tablet', 'Crocin 650 Tablet', 'Brufen 400 Tablet', 'Meftal Spas Tablet', 'Saridon Tablet'];
  const others = ['Vicks Cough Syrup', 'Calpol 500 Tablet', 'Benadryl Cough Syrup', 'Dabur Honitus Cough Syrup', 'Ondem-4 Tablet', 'Ibugesic Tablet', 'Sinarest Tablet'];

  const numBills = Math.floor(Math.random() * 6) + 25; // 25 to 30
  console.log(`Generating ${numBills} bills...`);
  
  let generatedBills = 0;

  for (let i = 0; i < numBills; i++) {
    const numItems = Math.floor(Math.random() * 4) + 1; // 1 to 4 items
    const itemsMap = new Map();

    // Bias towards anti-allergy and injections
    if (Math.random() > 0.4) {
      const allergyItem = antiAllergy[Math.floor(Math.random() * antiAllergy.length)];
      itemsMap.set(allergyItem, Math.floor(Math.random() * 3) + 1);
    }
    if (Math.random() > 0.5) {
      const injectionItem = injections[Math.floor(Math.random() * injections.length)];
      itemsMap.set(injectionItem, Math.floor(Math.random() * 5) + 1);
    }

    while (itemsMap.size < numItems) {
      const r = Math.random();
      let medPool = others;
      if (r < 0.4) medPool = painkillers;
      else if (r < 0.6) medPool = antiAllergy;
      else if (r < 0.8) medPool = injections;
      
      const med = medPool[Math.floor(Math.random() * medPool.length)];
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
        console.log(`Bill ${i + 1}/${numBills} generated: ${data.billNumber}`);
        generatedBills++;
      } else {
        console.error(`Bill ${i + 1}/${numBills} failed:`, data.message);
      }
    } catch (err) {
      console.error(`Bill ${i + 1}/${numBills} error:`, err.message);
    }

    // Delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`Finished generating ${generatedBills} bills.`);
  // Save the number of generated bills so the timestamp script knows exactly how many to update
  fs.writeFileSync('bills_generated_count.txt', generatedBills.toString());
}

main().catch(console.error);
