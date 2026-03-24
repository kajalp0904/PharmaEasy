const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // ✅ Added for ObjectId validation
const Medicine = require("../models/Medicine");
const Batch = require("../models/Batch");
const auth = require("../middleware/auth");

// Validation middleware for medicine input
function validateMedicineInput(req, res, next) {
  const { name, price } = req.body;
  const errors = [];
  
  if (!name || name.trim() === '') {
    errors.push('name is required');
  }
  
  if (!price) {
    errors.push('price is required');
  } else if (isNaN(price) || parseFloat(price) <= 0) {
    errors.push('price must be a positive number greater than zero');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
}

// Add new medicine (legacy endpoint)
router.post("/add-medicine", auth, async (req, res) => {
  try {
    const { name, price, minimumStock, category, manufacturer } = req.body;

    const existing = await Medicine.findOne({ name });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: "Medicine already exists" 
      });
    }

    const medicine = new Medicine({
      name,
      price,
      minimumStock: minimumStock || 10,
      category,
      manufacturer
    });

    await medicine.save();

    res.json({
      success: true,
      message: "Medicine added successfully",
      medicine
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Get all medicines
router.get("/medicines", auth, async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Fix medicine stock by calculating from batches
router.patch("/fix-stock/:id", auth, async (req, res) => {
  try {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid ID format" 
      });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        error: "Medicine not found" 
      });
    }
    
    const batches = await Batch.find({ medicine: medicine._id });
    const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);
    
    medicine.totalStock = totalStock;
    await medicine.save();
    
    res.json({
      success: true,
      message: `Stock updated to ${totalStock}`,
      medicine,
      batchCount: batches.length
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Auto-fix medicine stock from batches
router.post("/auto-fix-stock", auth, async (req, res) => {
  try {
    const medicines = await Medicine.find();
    const results = [];
    
    for (const medicine of medicines) {
      const batches = await Batch.find({ medicine: medicine._id });
      const calculatedStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);
      
      if (medicine.totalStock !== calculatedStock) {
        medicine.totalStock = calculatedStock;
        await medicine.save();
        results.push({
          medicine: medicine.name,
          oldStock: medicine.totalStock,
          newStock: calculatedStock,
          batchCount: batches.length
        });
      }
    }
    
    res.json({
      success: true,
      message: `Stock fixed for ${results.length} medicines`,
      results
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-sync ALL medicine stock from batches
router.post("/sync-all-stock", auth, async (req, res) => {
  try {
    const medicines = await Medicine.find();
    const results = [];
    let fixedCount = 0;
    
    for (const medicine of medicines) {
      const batches = await Batch.find({ medicine: medicine._id });
      const actualStock = batches.reduce((sum, batch) => sum + (batch.quantity || 0), 0);
      
      if (medicine.totalStock !== actualStock) {
        const oldStock = medicine.totalStock;
        medicine.totalStock = actualStock;
        await medicine.save();
        
        results.push({
          medicine: medicine.name,
          oldStock,
          newStock: actualStock,
          batchCount: batches.length,
          fixed: true
        });
        fixedCount++;
      } else {
        results.push({
          medicine: medicine.name,
          stock: actualStock,
          batchCount: batches.length,
          fixed: false
        });
      }
    }
    
    res.json({
      success: true,
      message: `Stock sync complete. Fixed ${fixedCount} of ${medicines.length} medicines.`,
      summary: {
        totalMedicines: medicines.length,
        fixed: fixedCount,
        correct: medicines.length - fixedCount
      },
      details: results
    });
    
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// ========== NEW: Search medicines (for autocomplete) ==========
// GET /api/medicines/search?q=...
router.get("/medicines/search", auth, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 2) return res.json([]);
    const medicines = await Medicine.find({
      name: { $regex: query, $options: "i" }
    }).limit(10);
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ========== NEW: Get single medicine by ID ==========
// GET /api/medicines/:id (with validation)
router.get("/medicines/:id", auth, async (req, res) => {
  try {
    // ✅ Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid ID format" 
      });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ 
        success: false, 
        error: "Medicine not found" 
      });
    }
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ========== NEW: Add medicine (RESTful POST) ==========
// POST /api/medicines
router.post("/medicines", auth, validateMedicineInput, async (req, res) => {
  try {
    const { name, price, minimumStock, category, manufacturer } = req.body;
    
    // Check for duplicate medicine name
    const existing = await Medicine.findOne({ name });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        error: 'Duplicate resource',
        message: `Medicine with name '${name}' already exists` 
      });
    }
    
    // Create new medicine
    const medicine = new Medicine({
      name,
      price,
      minimumStock: minimumStock || 10,
      category,
      manufacturer,
      totalStock: 0
    });
    
    await medicine.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Medicine added successfully", 
      medicine 
    });
    
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: err.message 
    });
  }
});

module.exports = router;