const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Batch = require("../models/Batch");
const Medicine = require("../models/Medicine");
const Location = require("../models/Location");

console.log("📦 Batch routes module loaded");
router.use((req, res, next) => {
  console.log(`⚡ Batch router hit: ${req.method} ${req.url}`);
  next();
});

// ============ VALIDATION MIDDLEWARE ============
function validateBatchInput(req, res, next) {
  const { medicineId, batchNumber, quantity, expiryDate, location, price } = req.body;
  const errors = [];
  
  if (!medicineId) errors.push('medicineId is required');
  if (!batchNumber) errors.push('batchNumber is required');
  if (!quantity) errors.push('quantity is required');
  else if (!Number.isInteger(parseInt(quantity)) || parseInt(quantity) <= 0)
    errors.push('quantity must be a positive integer');
  if (!expiryDate) errors.push('expiryDate is required');
  else if (isNaN(Date.parse(expiryDate))) errors.push('expiryDate must be a valid date');
  if (!location) errors.push('location is required');
  if (!price) errors.push('price is required');
  else if (isNaN(price) || parseFloat(price) <= 0) errors.push('price must be a positive number');
  
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
}

// ============ TEST GET ROUTE ============
router.get("/test-batch-get", (req, res) => {
  console.log("🧪 TEST GET route called");
  res.json({ message: "Test GET route works!" });
});

// ============ ONE-CLICK FIX ============
router.post("/oneclick-fix", auth, async (req, res) => {
  console.log("🔧 ONE-CLICK FIX STARTED");
  try {
    const db = mongoose.connection.db;
    
    // 1. Clean empty batches
    const deleteResult = await db.collection('batches').deleteMany({ quantity: 0 });
    console.log(`Deleted ${deleteResult.deletedCount} empty batches`);
    
    // 2. Fix duplicate locations
    const batches = await db.collection('batches').find({}).toArray();
    const locationMap = {};
    for (const batch of batches) {
      if (locationMap[batch.location]) {
        const newLocation = `${batch.location}-ALT-${Date.now()}`;
        console.log(`Moving duplicate ${batch.batchNumber} from ${batch.location} to ${newLocation}`);
        await db.collection('batches').updateOne(
          { _id: batch._id },
          { $set: { location: newLocation } }
        );
        batch.location = newLocation;
      } else {
        locationMap[batch.location] = batch._id;
      }
    }
    
    // 3. Sync locations with batches
    const locations = await db.collection('locations').find({}).toArray();
    let fixedLocations = 0;
    for (const loc of locations) {
      const batchAtLocation = await db.collection('batches').findOne({ location: loc.code });
      if (batchAtLocation) {
        const medicine = await db.collection('medicines').findOne({ _id: batchAtLocation.medicine });
        await db.collection('locations').updateOne(
          { _id: loc._id },
          {
            $set: {
              isOccupied: true,
              currentBatchId: batchAtLocation._id.toString(),
              medicineName: medicine ? medicine.name : "Unknown",
              batchNumber: batchAtLocation.batchNumber,
              quantity: batchAtLocation.quantity,
              updatedAt: new Date()
            }
          }
        );
        fixedLocations++;
      } else {
        await db.collection('locations').updateOne(
          { _id: loc._id },
          {
            $set: { isOccupied: false },
            $unset: { currentBatchId: "", medicineName: "", batchNumber: "", quantity: "" }
          }
        );
        fixedLocations++;
      }
    }
    
    // 4. Recalculate medicine stocks
    const medicines = await db.collection('medicines').find({}).toArray();
    for (const med of medicines) {
      const batches = await db.collection('batches').find({ medicine: med._id }).toArray();
      const actualStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
      await db.collection('medicines').updateOne(
        { _id: med._id },
        { $set: { totalStock: actualStock } }
      );
    }
    
    console.log("✅ ONE-CLICK FIX COMPLETE");
    res.json({
      success: true,
      message: "System fixed successfully!",
      details: {
        emptyBatchesRemoved: deleteResult.deletedCount,
        locationsFixed: fixedLocations,
        medicinesUpdated: medicines.length
      }
    });
  } catch (error) {
    console.error("Fix error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CREATE BATCH (NO TRANSACTION) ============
router.post("/batches", auth, validateBatchInput, async (req, res) => {
  console.log("🚀 BATCH CREATION (NO TRANSACTION)");
  console.log("Request:", req.body);

  try {
    const { medicineId, batchNumber, quantity, expiryDate, location, price } = req.body;

    if (!mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({ success: false, error: "Invalid medicine ID format" });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, error: "Medicine not found" });
    }

    const locationRecord = await Location.findOne({ code: location, isOccupied: false });
    if (!locationRecord) {
      return res.status(400).json({ success: false, error: "Location is not available or already occupied" });
    }

    const batch = new Batch({
      medicine: medicineId,
      batchNumber,
      quantity: parseInt(quantity),
      location,
      expiryDate: new Date(expiryDate),
      price: parseFloat(price)
    });
    await batch.save();
    console.log("Batch saved:", batch._id);

    locationRecord.isOccupied = true;
    locationRecord.currentBatch = batch._id;
    locationRecord.medicineName = medicine.name;
    locationRecord.batchNumber = batchNumber;
    locationRecord.quantity = parseInt(quantity);
    locationRecord.expiryDate = new Date(expiryDate);
    await locationRecord.save();
    console.log("Location updated");

    medicine.totalStock += parseInt(quantity);
    await medicine.save();
    console.log(`Medicine stock: ${medicine.totalStock}`);

    res.status(201).json({
      success: true,
      message: `✅ Batch added to ${locationRecord.code}`,
      data: {
        batchId: batch._id,
        location: locationRecord.code,
        medicine: medicine.name,
        quantity: batch.quantity,
        newStock: medicine.totalStock
      }
    });

  } catch (error) {
    console.error("❌ Batch creation error:", error.message);
    res.status(500).json({ success: false, error: "Batch creation failed. Please try again.", details: error.message });
  }
});

// ============ GET ALL BATCHES ============
router.get("/batches", auth, async (req, res) => {
  console.log("🔍 GET /batches called");
  try {
    const { medicine } = req.query;
    let query = {};
    
    if (medicine) {
      if (!mongoose.Types.ObjectId.isValid(medicine)) {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
      }
      query.medicine = medicine;
    }
    
    const batches = await Batch.find(query)
      .populate('medicine', 'name manufacturer price')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${batches.length} batches`);
    res.status(200).json({ success: true, count: batches.length, batches });
    
  } catch (err) {
    console.log("❌ Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ FIX MEDICINE STOCK ============
router.post("/fix-stock/:medicineId", auth, async (req, res) => {
  try {
    const medicineId = req.params.medicineId;
    
    if (!mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({ success: false, error: "Invalid ID format" });
    }
    
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, error: "Medicine not found" });
    }
    
    const batches = await Batch.find({ medicine: medicineId });
    const actualStock = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
    
    const oldStock = medicine.totalStock;
    medicine.totalStock = actualStock;
    await medicine.save();
    
    console.log(`Fixed ${medicine.name}: ${oldStock} → ${actualStock}`);
    
    res.json({
      success: true,
      medicine: medicine.name,
      batches: batches.length,
      oldStock,
      newStock: actualStock
    });
    
  } catch (error) {
    console.error("Fix stock error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log all routes
console.log("📋 Registered batch routes:");
router.stack.forEach((r) => {
  if (r.route) {
    const methods = Object.keys(r.route.methods).join(',').toUpperCase();
    console.log(`  ${methods} ${r.route.path}`);
  }
});

module.exports = router;