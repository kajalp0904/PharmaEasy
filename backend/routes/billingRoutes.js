const express = require("express");
const router = express.Router();
const Medicine = require("../models/Medicine");
const Batch = require("../models/Batch");
const Location = require("../models/Location");
const Bill = require("../models/Bill");
const auth = require("../middleware/auth");

// Generate bill with FIFO
router.post("/generate-bill", auth, async (req, res) => {
  try {
    const { items, customerName, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Items array is required" 
      });
    }

    let allBillItems = [];
    let totalAmount = 0;
    const updates = [];

    for (const item of items) {
      const { medicineName, quantityRequired } = item;

      // 1. Find medicine
      const medicine = await Medicine.findOne({ name: medicineName });
      if (!medicine) {
        return res.status(404).json({ 
          success: false,
          message: `Medicine "${medicineName}" not found` 
        });
      }

      // 2. Check stock
      if (medicine.totalStock < quantityRequired) {
        return res.status(400).json({ 
          success: false,
          message: `Insufficient stock for ${medicineName}. Available: ${medicine.totalStock}` 
        });
      }

      let remaining = quantityRequired;
      let medicineTotal = 0;

      // 3. Get batches (FIFO by expiry)
      const batches = await Batch.find({ 
        medicine: medicine._id,
        quantity: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      // 4. Deduct from each batch
      for (let batch of batches) {
        if (remaining <= 0) break;

        const deduct = Math.min(batch.quantity, remaining);
        
        // Add to bill
        allBillItems.push({
          medicineName,
          batchNumber: batch.batchNumber,
          quantitySold: deduct,
          price: deduct * medicine.price
        });

        // Update batch
        batch.quantity -= deduct;
        remaining -= deduct;
        medicineTotal += deduct * medicine.price;
        
        updates.push(batch.save());

        // If batch empty, free location
        if (batch.quantity === 0) {
          const location = await Location.findOne({ code: batch.location });
          if (location) {
            location.isOccupied = false;
            location.currentBatch = null;
            location.medicineName = "";
            location.batchNumber = "";
            location.expiryDate = null;
            location.quantity = 0;
            updates.push(location.save());
          }
        }
      }

      if (remaining > 0) {
        return res.status(400).json({ 
          success: false,
          message: `Stock error for ${medicineName}` 
        });
      }

      // 5. Update medicine stock
      medicine.totalStock -= quantityRequired;
      updates.push(medicine.save());

      totalAmount += medicineTotal;
    }

    // Wait for all updates
    await Promise.all(updates);

    // 6. Save bill
    const bill = new Bill({
      billNumber: `BILL-${Date.now()}`,
      customerName: customerName || "Walk-in Customer",
      items: allBillItems,
      totalAmount,
      paymentMethod: paymentMethod || "Cash"
    });

    await bill.save();

    res.json({
      success: true,
      message: "Bill generated successfully",
      billNumber: bill.billNumber,
      totalAmount,
      billId: bill._id
    });

  } catch (err) {
    console.error("Billing error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Get all bills
router.get("/bills", auth, async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Get a single bill by billNumber or ID
router.get("/bills/:id", auth, async (req, res) => {
  try {
    const param = req.params.id;
    let bill = await Bill.findOne({ billNumber: param });
    
    // Fallback if the user passes the MongoDB _id
    if (!bill && param.match(/^[0-9a-fA-F]{24}$/)) {
      bill = await Bill.findById(param);
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    res.json({ success: true, bill });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;