
// =====================================================
// PharmaEasy Automation Script - Om Medical (May 2, 2025)
// Backend: https://pharmaeasy-a9xk.onrender.com
// =====================================================

const BASE = 'https://pharmaeasy-a9xk.onrender.com/api';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  let data;
  try { data = await res.json(); } catch(e) { data = {}; }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('============================================================');
  console.log('  PHARMEASY AUTOMATION - Om Medical');
  console.log('  Started at:', new Date().toISOString());
  console.log('============================================================\n');

  // ---- STEP 1: WAKE UP SERVER ----
  console.log('=== STEP 1: Waking up server ===');
  try {
    console.log('Sending wake-up ping...');
    const wake = await apiFetch(`${BASE}/medicines`);
    console.log('Server wake ping status:', wake.status);
    if (wake.status !== 200) {
      console.log('Server may be sleeping. Waiting 30 seconds...');
      await sleep(30000);
    }
  } catch(e) {
    console.log('Wake ping failed, waiting 30 seconds for server to start...', e.message);
    await sleep(30000);
  }

  // ---- STEP 2: LOGIN ----
  console.log('\n=== STEP 2: Login ===');
  let token;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { status, ok, data } = await apiFetch(`${BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ommedical@0910', password: 'om@123' })
      });
      console.log(`Login attempt ${attempt}: HTTP ${status}`);
      if (data.token) {
        token = data.token;
        console.log('Login SUCCESS. Token:', token.substring(0, 40) + '...');
        break;
      } else {
        console.log('No token in response:', JSON.stringify(data));
        if (attempt < 3) { console.log('Retrying in 15s...'); await sleep(15000); }
      }
    } catch(e) {
      console.log(`Login attempt ${attempt} error:`, e.message);
      if (attempt < 3) { console.log('Retrying in 15s...'); await sleep(15000); }
    }
  }
  if (!token) { console.error('CRITICAL: Login failed after 3 attempts. Exiting.'); process.exit(1); }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // ---- STEP 3: GET EXISTING MEDICINES ----
  console.log('\n=== STEP 3: Fetch existing medicines ===');
  let existingMeds = [];
  try {
    const { data } = await apiFetch(`${BASE}/medicines`, { headers });
    existingMeds = Array.isArray(data) ? data : [];
    console.log('Existing medicines:', existingMeds.length);
    existingMeds.forEach(m => console.log(`  - ${m.name} [${m._id}]`));
  } catch(e) { console.error('Error fetching medicines:', e.message); }

  const existingMedMap = {};
  for (const m of existingMeds) existingMedMap[m.name] = m._id;

  // ---- STEP 4: ADD MEDICINES ----
  console.log('\n=== STEP 4: Add missing medicines ===');
  const medicinesToAdd = [
    { name: "Dolo 650 Tablet", price: 32, manufacturer: "Micro Labs", category: "Painkiller", minimumStock: 20 },
    { name: "Crocin 650 Tablet", price: 35, manufacturer: "GSK", category: "Painkiller", minimumStock: 20 },
    { name: "Combiflam Tablet", price: 30, manufacturer: "Sanofi", category: "Painkiller", minimumStock: 15 },
    { name: "Brufen 400 Tablet", price: 15, manufacturer: "Abbott", category: "Painkiller", minimumStock: 15 },
    { name: "Sinarest Tablet", price: 55, manufacturer: "Cipla", category: "Anti-Cold", minimumStock: 10 },
    { name: "Nocold Tablet", price: 32, manufacturer: "Mankind", category: "Anti-Cold", minimumStock: 10 },
    { name: "D Cold Tablet", price: 22, manufacturer: "Dr. Reddy's", category: "Anti-Cold", minimumStock: 10 },
    { name: "Dabur Honitus Cough Syrup", price: 65, manufacturer: "Dabur", category: "Cough & Cold", minimumStock: 10 },
    { name: "Benadryl Cough Syrup", price: 95, manufacturer: "Benadryl", category: "Cough & Cold", minimumStock: 10 },
    { name: "Vicks Cough Syrup", price: 98, manufacturer: "P&G", category: "Cough & Cold", minimumStock: 10 },
    { name: "Himalaya Koflet Syrup", price: 90, manufacturer: "Himalaya", category: "Cough & Cold", minimumStock: 10 },
    { name: "Ondem-4 Tablet", price: 65, manufacturer: "Cipla", category: "Anti-Emetic", minimumStock: 10 },
    { name: "Domstal 10mg Tablet", price: 42, manufacturer: "Torrent", category: "Anti-Emetic", minimumStock: 10 },
    { name: "Vomikind-MD 4mg Tablet", price: 48, manufacturer: "Mankind", category: "Anti-Emetic", minimumStock: 10 },
    { name: "Meftal Spas Tablet", price: 55, manufacturer: "Blue Cross", category: "Antispasmodic", minimumStock: 10 },
    { name: "Cyclopam Tablet", price: 48, manufacturer: "Indoco", category: "Antispasmodic", minimumStock: 10 },
    { name: "Cetirizine 10mg Tablet", price: 25, manufacturer: "Generic", category: "Anti-Allergy", minimumStock: 10 },
    { name: "Alerid 10mg Tablet", price: 30, manufacturer: "Cipla", category: "Anti-Allergy", minimumStock: 10 },
    { name: "Monocef 1gm Injection", price: 95, manufacturer: "Aristo", category: "Antibiotic Injection", minimumStock: 5 },
    { name: "Mikacin 500mg Injection", price: 100, manufacturer: "Mikacin", category: "Antibiotic Injection", minimumStock: 5 },
    { name: "Ciprofloxacin Injection", price: 80, manufacturer: "Cipla", category: "Antibiotic Injection", minimumStock: 5 },
    { name: "Lariago 250mg Tablet", price: 30, manufacturer: "IPCA", category: "Anti-Malarial", minimumStock: 10 }
  ];

  const medIdMap = { ...existingMedMap };
  let medicinesAdded = 0;
  let medicinesSkipped = 0;

  for (const med of medicinesToAdd) {
    if (existingMedMap[med.name]) {
      console.log(`  SKIP (exists): ${med.name}`);
      medicinesSkipped++;
    } else {
      try {
        const { status, ok, data } = await apiFetch(`${BASE}/medicines`, {
          method: 'POST', headers, body: JSON.stringify(med)
        });
        if (data._id) {
          medIdMap[med.name] = data._id;
          console.log(`  ADDED: ${med.name} -> ${data._id}`);
          medicinesAdded++;
        } else {
          console.error(`  FAILED (HTTP ${status}): ${med.name} ->`, JSON.stringify(data));
        }
      } catch(e) { console.error(`  ERROR adding ${med.name}:`, e.message); }
      await sleep(400);
    }
  }
  console.log(`\nMedicines: ${medicinesAdded} added, ${medicinesSkipped} skipped`);

  // Re-fetch to make sure we have all IDs
  console.log('\nRe-fetching medicine list to confirm all IDs...');
  try {
    const { data } = await apiFetch(`${BASE}/medicines`, { headers });
    if (Array.isArray(data)) {
      for (const m of data) medIdMap[m.name] = m._id;
      console.log('Confirmed', data.length, 'medicines in system.');
    }
  } catch(e) { console.error('Re-fetch error:', e.message); }

  // ---- STEP 5: ADD BATCHES ----
  console.log('\n=== STEP 5: Add batches (2 per medicine) ===');

  const prefixMap = {
    "Dolo 650 Tablet": "DOLO", "Crocin 650 Tablet": "CROC", "Combiflam Tablet": "COMB",
    "Brufen 400 Tablet": "BRUF", "Sinarest Tablet": "SINA", "Nocold Tablet": "NOCO",
    "D Cold Tablet": "DCOL", "Dabur Honitus Cough Syrup": "DABH", "Benadryl Cough Syrup": "BENA",
    "Vicks Cough Syrup": "VICK", "Himalaya Koflet Syrup": "KOFL", "Ondem-4 Tablet": "OND4",
    "Domstal 10mg Tablet": "DOMS", "Vomikind-MD 4mg Tablet": "VOMI", "Meftal Spas Tablet": "MEFT",
    "Cyclopam Tablet": "CYCP", "Cetirizine 10mg Tablet": "CETI", "Alerid 10mg Tablet": "ALRD",
    "Monocef 1gm Injection": "MONO", "Mikacin 500mg Injection": "MIKA",
    "Ciprofloxacin Injection": "CIPR", "Lariago 250mg Tablet": "LARI"
  };

  const priceMap = {
    "Dolo 650 Tablet": 32, "Crocin 650 Tablet": 35, "Combiflam Tablet": 30,
    "Brufen 400 Tablet": 15, "Sinarest Tablet": 55, "Nocold Tablet": 32,
    "D Cold Tablet": 22, "Dabur Honitus Cough Syrup": 65, "Benadryl Cough Syrup": 95,
    "Vicks Cough Syrup": 98, "Himalaya Koflet Syrup": 90, "Ondem-4 Tablet": 65,
    "Domstal 10mg Tablet": 42, "Vomikind-MD 4mg Tablet": 48, "Meftal Spas Tablet": 55,
    "Cyclopam Tablet": 48, "Cetirizine 10mg Tablet": 25, "Alerid 10mg Tablet": 30,
    "Monocef 1gm Injection": 95, "Mikacin 500mg Injection": 100,
    "Ciprofloxacin Injection": 80, "Lariago 250mg Tablet": 30
  };

  function getNextBatchNum(existingBatches, prefix) {
    if (!existingBatches || existingBatches.length === 0) return `${prefix}-A001`;
    let maxVal = -1, maxLetter = 'A', maxNum = 0;
    for (const b of existingBatches) {
      const bn = b.batchNumber || '';
      const match = bn.match(/-([A-Z])(\d+)$/);
      if (match) {
        const letter = match[1];
        const num = parseInt(match[2], 10);
        const val = (letter.charCodeAt(0) - 65) * 100000 + num;
        if (val > maxVal) { maxVal = val; maxLetter = letter; maxNum = num; }
      }
    }
    if (maxVal === -1) return `${prefix}-A001`;
    return `${prefix}-${maxLetter}${String(maxNum + 1).padStart(3, '0')}`;
  }

  let batchesAdded = 0, batchesFailed = 0;

  for (const medName of Object.keys(prefixMap)) {
    const medId = medIdMap[medName];
    if (!medId) { console.warn(`  No ID for "${medName}" - skipping batches`); continue; }

    const prefix = prefixMap[medName];
    const price = priceMap[medName];

    // Fetch existing batches
    let existingBatches = [];
    try {
      const { data } = await apiFetch(`${BASE}/batches?medicine=${medId}`, { headers });
      existingBatches = Array.isArray(data) ? data : (Array.isArray(data.batches) ? data.batches : []);
    } catch(e) { console.error(`  Error fetching batches for ${medName}:`, e.message); }

    const batch1Num = getNextBatchNum(existingBatches, prefix);
    const fakeList = [...existingBatches, { batchNumber: batch1Num }];
    const batch2Num = getNextBatchNum(fakeList, prefix);

    console.log(`\n  ${medName} [${existingBatches.length} existing]`);
    console.log(`    Adding: ${batch1Num} (qty:250, exp:2027-06-30) | ${batch2Num} (qty:180, exp:2026-12-31)`);

    // Add Batch 1
    try {
      const { status, ok, data } = await apiFetch(`${BASE}/batches`, {
        method: 'POST', headers,
        body: JSON.stringify({ medicineId: medId, batchNumber: batch1Num, quantity: 250, expiryDate: "2027-06-30", price })
      });
      if (ok && (data._id || data.batchNumber)) { console.log(`    ✓ ${batch1Num} added`); batchesAdded++; }
      else { console.error(`    ✗ ${batch1Num} FAILED (HTTP ${status}):`, JSON.stringify(data)); batchesFailed++; }
    } catch(e) { console.error(`    ✗ ${batch1Num} ERROR:`, e.message); batchesFailed++; }

    await sleep(300);

    // Add Batch 2
    try {
      const { status, ok, data } = await apiFetch(`${BASE}/batches`, {
        method: 'POST', headers,
        body: JSON.stringify({ medicineId: medId, batchNumber: batch2Num, quantity: 180, expiryDate: "2026-12-31", price })
      });
      if (ok && (data._id || data.batchNumber)) { console.log(`    ✓ ${batch2Num} added`); batchesAdded++; }
      else { console.error(`    ✗ ${batch2Num} FAILED (HTTP ${status}):`, JSON.stringify(data)); batchesFailed++; }
    } catch(e) { console.error(`    ✗ ${batch2Num} ERROR:`, e.message); batchesFailed++; }

    await sleep(300);
  }
  console.log(`\nBatches: ${batchesAdded} added, ${batchesFailed} failed`);

  // ---- STEP 6: GENERATE 25 BILLS ----
  console.log('\n=== STEP 6: Generate 25 bills (5s delay each) ===');

  const bills = [
    { items: [{ medicineName: "Dolo 650 Tablet", quantityRequired: 10 }] },
    { items: [{ medicineName: "Benadryl Cough Syrup", quantityRequired: 2 }] },
    { items: [{ medicineName: "Combiflam Tablet", quantityRequired: 6 }, { medicineName: "Sinarest Tablet", quantityRequired: 3 }] },
    { items: [{ medicineName: "Monocef 1gm Injection", quantityRequired: 3 }] },
    { items: [{ medicineName: "Nocold Tablet", quantityRequired: 5 }, { medicineName: "Dabur Honitus Cough Syrup", quantityRequired: 1 }, { medicineName: "Dolo 650 Tablet", quantityRequired: 5 }] },
    { items: [{ medicineName: "Meftal Spas Tablet", quantityRequired: 4 }, { medicineName: "Ondem-4 Tablet", quantityRequired: 3 }] },
    { items: [{ medicineName: "Crocin 650 Tablet", quantityRequired: 12 }] },
    { items: [{ medicineName: "Vicks Cough Syrup", quantityRequired: 1 }, { medicineName: "Cetirizine 10mg Tablet", quantityRequired: 6 }] },
    { items: [{ medicineName: "Mikacin 500mg Injection", quantityRequired: 4 }] },
    { items: [{ medicineName: "Brufen 400 Tablet", quantityRequired: 8 }, { medicineName: "Domstal 10mg Tablet", quantityRequired: 3 }, { medicineName: "Cyclopam Tablet", quantityRequired: 2 }] },
    { items: [{ medicineName: "Himalaya Koflet Syrup", quantityRequired: 2 }] },
    { items: [{ medicineName: "Lariago 250mg Tablet", quantityRequired: 6 }, { medicineName: "Cetirizine 10mg Tablet", quantityRequired: 4 }] },
    { items: [{ medicineName: "D Cold Tablet", quantityRequired: 5 }] },
    { items: [{ medicineName: "Nocold Tablet", quantityRequired: 4 }, { medicineName: "Dolo 650 Tablet", quantityRequired: 8 }] },
    { items: [{ medicineName: "Ciprofloxacin Injection", quantityRequired: 2 }, { medicineName: "Dabur Honitus Cough Syrup", quantityRequired: 1 }] },
    { items: [{ medicineName: "Sinarest Tablet", quantityRequired: 3 }, { medicineName: "Vomikind-MD 4mg Tablet", quantityRequired: 4 }, { medicineName: "Benadryl Cough Syrup", quantityRequired: 1 }] },
    { items: [{ medicineName: "Alerid 10mg Tablet", quantityRequired: 5 }] },
    { items: [{ medicineName: "Cetirizine 10mg Tablet", quantityRequired: 5 }, { medicineName: "D Cold Tablet", quantityRequired: 3 }] },
    { items: [{ medicineName: "Monocef 1gm Injection", quantityRequired: 2 }] },
    { items: [{ medicineName: "Crocin 650 Tablet", quantityRequired: 10 }, { medicineName: "Himalaya Koflet Syrup", quantityRequired: 1 }, { medicineName: "Cetirizine 10mg Tablet", quantityRequired: 5 }] },
    { items: [{ medicineName: "Combiflam Tablet", quantityRequired: 5 }, { medicineName: "Meftal Spas Tablet", quantityRequired: 3 }] },
    { items: [{ medicineName: "Vicks Cough Syrup", quantityRequired: 2 }] },
    { items: [{ medicineName: "Ondem-4 Tablet", quantityRequired: 2 }, { medicineName: "Brufen 400 Tablet", quantityRequired: 6 }] },
    { items: [{ medicineName: "Dolo 650 Tablet", quantityRequired: 10 }, { medicineName: "D Cold Tablet", quantityRequired: 3 }, { medicineName: "Domstal 10mg Tablet", quantityRequired: 2 }] },
    { items: [{ medicineName: "Lariago 250mg Tablet", quantityRequired: 4 }] }
  ];

  let billsSucceeded = 0, billsFailed = 0;

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];
    const meds = bill.items.map(x => `${x.medicineName}(x${x.quantityRequired})`).join(', ');
    console.log(`\n  Bill ${i + 1}/25: ${meds}`);

    try {
      const { status, ok, data } = await apiFetch(`${BASE}/generate-bill`, {
        method: 'POST', headers, body: JSON.stringify(bill)
      });
      if (ok) {
        const billNum = data.billNumber || data._id || '?';
        console.log(`    ✓ SUCCESS (HTTP ${status}) - Bill#: ${billNum}`);
        billsSucceeded++;
      } else {
        console.error(`    ✗ FAILED (HTTP ${status}):`, JSON.stringify(data));
        billsFailed++;
      }
    } catch(e) {
      console.error(`    ✗ ERROR:`, e.message);
      billsFailed++;
    }

    if (i < bills.length - 1) {
      console.log(`    Waiting 5 seconds...`);
      await sleep(5000);
    }
  }

  // ---- STEP 7: DASHBOARD ----
  console.log('\n=== STEP 7: Dashboard ===');
  try {
    const { status, data } = await apiFetch(`${BASE}/dashboard`, { headers });
    console.log(`Dashboard (HTTP ${status}):`, JSON.stringify(data, null, 2));
  } catch(e) { console.error('Dashboard error:', e.message); }

  // ---- FINAL REPORT ----
  console.log('\n============================================================');
  console.log('  FINAL REPORT');
  console.log('============================================================');
  console.log(`  Medicines added:           ${medicinesAdded}`);
  console.log(`  Medicines skipped:         ${medicinesSkipped}`);
  console.log(`  Batches added:             ${batchesAdded}`);
  console.log(`  Batches failed:            ${batchesFailed}`);
  console.log(`  Bills succeeded:           ${billsSucceeded}`);
  console.log(`  Bills failed:              ${billsFailed}`);
  console.log(`  Completed at:              ${new Date().toISOString()}`);
  console.log('============================================================');
}

main().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
