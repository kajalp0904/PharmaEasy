const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Batch = require("../models/Batch");
const Medicine = require("../models/Medicine");
const Location = require("../models/Location");

// GET expired batches for a specific medicine by name
router.get("/expired-batches", auth, async (req, res) => {
  try {
    const medicineName = req.query.medicine;
    
    if (!medicineName) {
      return res.status(400).json({ success: false, error: "Medicine name is required" });
    }

    // Find the medicine(s) by name (case-insensitive regex)
    const medicines = await Medicine.find({ 
      name: { $regex: new RegExp(medicineName, 'i') } 
    });

    if (!medicines || medicines.length === 0) {
      return res.status(404).json({ success: false, error: "Medicine not found" });
    }

    const medicineIds = medicines.map(m => m._id);

    // Find all expired batches for these medicines
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today

    const expiredBatches = await Batch.find({
      medicine: { $in: medicineIds },
      expiryDate: { $lt: currentDate },
      quantity: { $gt: 0 }
    }).populate('medicine', 'name');

    res.json({
      success: true,
      count: expiredBatches.length,
      batches: expiredBatches.map(b => ({
        id: b._id,
        medicineName: b.medicine.name,
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        location: b.location
      }))
    });

  } catch (error) {
    console.error("Error fetching expired batches:", error);
    res.status(500).json({ success: false, error: "Server error while fetching expired batches" });
  }
});

// DELETE an expired batch and handle cleanup
router.delete("/expired-batches/:id", auth, async (req, res) => {
  try {
    const batchId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({ success: false, error: "Invalid batch ID format" });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    const medicineId = batch.medicine;

    // 1. Delete the batch
    await Batch.findByIdAndDelete(batchId);

    // 2. Free up the location
    if (batch.location) {
      const location = await Location.findOne({ code: batch.location });
      if (location) {
        location.isOccupied = false;
        location.currentBatch = null;
        location.medicineName = "";
        location.batchNumber = "";
        location.expiryDate = null;
        location.quantity = 0;
        await location.save();
      }
    }

    // 3. Recalculate medicine stock or delete medicine if no batches left
    const remainingBatches = await Batch.find({ medicine: medicineId, quantity: { $gt: 0 } });
    
    let medicineDeleted = false;
    let newTotalStock = 0;

    if (remainingBatches.length === 0) {
      // No valid batches left, delete the medicine completely
      await Medicine.findByIdAndDelete(medicineId);
      medicineDeleted = true;
    } else {
      // Recalculate total stock from remaining batches
      newTotalStock = remainingBatches.reduce((total, b) => total + b.quantity, 0);
      await Medicine.findByIdAndUpdate(medicineId, { totalStock: newTotalStock });
    }

    res.json({
      success: true,
      message: "Expired batch removed successfully",
      medicineDeleted,
      newTotalStock
    });

  } catch (error) {
    console.error("Error deleting expired batch:", error);
    res.status(500).json({ success: false, error: "Server error while removing expired batch" });
  }
});

module.exports = router;
