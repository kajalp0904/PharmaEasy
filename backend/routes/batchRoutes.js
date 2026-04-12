const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Batch = require("../models/Batch");
const Medicine = require("../models/Medicine");
const Location = require("../models/Location");



// ============ VALIDATION MIDDLEWARE ============
function validateBatchInput(req, res, next) {
  const { medicineId, batchNumber, quantity, expiryDate, price } = req.body;
  const errors = [];
  
  if (!medicineId) errors.push('medicineId is required');
  if (!batchNumber) errors.push('batchNumber is required');
  if (!quantity) errors.push('quantity is required');
  else if (!Number.isInteger(parseInt(quantity)) || parseInt(quantity) <= 0)
    errors.push('quantity must be a positive integer');
  if (!expiryDate) errors.push('expiryDate is required');
  else if (isNaN(Date.parse(expiryDate))) errors.push('expiryDate must be a valid date');
  if (!price) errors.push('price is required');
  else if (isNaN(price) || parseFloat(price) <= 0) errors.push('price must be a positive number');
  // Note: location is now OPTIONAL — auto-assigned if not provided
  
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
  }
  next();
}


// ============ TEST GET ROUTE ============
router.get("/test-batch-get", (req, res) => {
  res.json({ message: "Test GET route works!" });
});

// ============ ONE-CLICK FIX ============
router.post("/oneclick-fix", auth, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // 1. Clean empty batches
    const deleteResult = await db.collection('batches').deleteMany({ quantity: 0 });
    
    // 2. Fix duplicate locations
    const batches = await db.collection('batches').find({}).toArray();
    const locationMap = {};
    for (const batch of batches) {
      if (locationMap[batch.location]) {
        const newLocation = `${batch.location}-ALT-${Date.now()}`;
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

// ============ CREATE BATCH ============
router.post("/batches", auth, validateBatchInput, async (req, res) => {
  try {
    console.log("POST /batches PAYLOAD:", req.body);
    const { medicineId, batchNumber, quantity, expiryDate, location, price } = req.body;

    if (!mongoose.Types.ObjectId.isValid(medicineId)) {
      return res.status(400).json({ success: false, error: "Invalid medicine ID format" });
    }

    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ success: false, error: "Medicine not found" });
    }

    // ===== LOCATION: auto-assign if none provided or none free =====
    let assignedLocation = location || null;
    let locationRecord = null;

    if (assignedLocation) {
      // Try to use the requested location
      locationRecord = await Location.findOne({ code: assignedLocation, isOccupied: false });
    }

    if (!locationRecord) {
      // Try any free location
      locationRecord = await Location.findOne({ isOccupied: false });
    }

    if (!locationRecord) {
      // No free location -> generate a new dynamic one!
      try {
        const { generateNextLocationCode } = require('./locationRoutes');
        const nextCode = await generateNextLocationCode();
        
        locationRecord = new Location({
          code: nextCode,
          isOccupied: false
        });
        await locationRecord.save();
      } catch (err) {
        console.error("❌ Failed to generate new location:", err.message);
      }
    }

    // Final fallback: use a generated code so the batch is NEVER blocked
    assignedLocation = locationRecord ? locationRecord.code : `AUTO-${Date.now()}`;

    // ===== SAVE BATCH =====
    const batch = new Batch({
      medicine: medicineId,
      batchNumber,
      quantity: parseInt(quantity),
      location: assignedLocation,
      expiryDate: new Date(expiryDate),
      price: parseFloat(price)
    });
    await batch.save(); // post-save hook fires as backup

    // ===== EXPLICIT STOCK RECALCULATION (guaranteed to run) =====
    // Do NOT rely solely on the hook — recalculate here synchronously
    const stockResult = await Batch.aggregate([
      { $match: { medicine: new mongoose.Types.ObjectId(medicineId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const calculatedStock = stockResult[0]?.total || 0;
    await Medicine.findByIdAndUpdate(medicineId, { $set: { totalStock: calculatedStock } });

    // Update location record if we have one
    if (locationRecord) {
      locationRecord.isOccupied = true;
      locationRecord.currentBatch = batch._id;
      locationRecord.medicineName = medicine.name;
      locationRecord.batchNumber = batchNumber;
      locationRecord.quantity = parseInt(quantity);
      locationRecord.expiryDate = new Date(expiryDate);
      await locationRecord.save();
    }

    res.status(201).json({
      success: true,
      message: `✅ Batch added successfully at ${assignedLocation}`,
      data: {
        batchId: batch._id,
        location: assignedLocation,
        medicine: medicine.name,
        quantity: batch.quantity,
        newStock: calculatedStock
      }
    });


  } catch (error) {
    console.error("❌ Batch creation error:", error.message);
    res.status(500).json({ success: false, error: "Batch creation failed. Please try again.", details: error.message });
  }
});


// ============ GET ALL BATCHES ============
router.get("/batches", auth, async (req, res) => {
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
    
    res.status(200).json({ success: true, count: batches.length, batches });
    
  } catch (err) {
    console.error("❌ Error fetching batches:", err.message);
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
    console.error("Fix stock error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;