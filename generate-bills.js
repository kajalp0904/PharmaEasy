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

  const medicines = [
    'Dolo 650 Tablet', 'Combiflam Tablet', 'Vicks Cough Syrup', 'Calpol 500 Tablet',
    'Benadryl Cough Syrup', 'Cetirizine 10mg Tablet', 'Allegra 120mg Tablet',
    'Dabur Honitus Cough Syrup', 'Xyzal 5mg Tablet', 'Monocef 1gm Injection',
    'Brufen 400 Tablet', 'Meftal Spas Tablet', 'Saridon Tablet', 'D Cold Tablet',
    'Vicks Action 500 Tablet', 'Ondem-4 Tablet', 'Crocin 650 Tablet', 'Ibugesic Tablet'
  ];

  const popular = ['Dolo 650 Tablet', 'Combiflam Tablet', 'Vicks Cough Syrup'];

  const numBills = Math.floor(Math.random() * 6) + 25; // 25 to 30
  console.log(`Generating ${numBills} bills...`);

  for (let i = 0; i < numBills; i++) {
    const numItems = Math.floor(Math.random() * 4) + 1; // 1 to 4 items
    const itemsMap = new Map();

    // Force one popular item in ~50% of the bills
    if (Math.random() > 0.5) {
      const popItem = popular[Math.floor(Math.random() * popular.length)];
      itemsMap.set(popItem, Math.floor(Math.random() * 3) + 1);
    }

    while (itemsMap.size < numItems) {
      const med = medicines[Math.floor(Math.random() * medicines.length)];
      if (!itemsMap.has(med)) {
        itemsMap.set(med, Math.floor(Math.random() * 3) + 1);
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
      } else {
        console.error(`Bill ${i + 1}/${numBills} failed:`, data.message);
      }
    } catch (err) {
      console.error(`Bill ${i + 1}/${numBills} error:`, err.message);
    }

    // Small delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('Finished generating bills.');
}

main().catch(console.error);
