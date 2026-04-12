const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");

// Store active alerts in memory
let activeAlerts = {
  lowStock: [],
  expiringSoon: [],
  expired: []
};

// ============ REAL-TIME ALERT CHECKING ============
async function checkAlertsRealTime() {
  try {
    const Medicine = mongoose.model('Medicine');
    const Batch = mongoose.model('Batch');
    
    const now = new Date();
    
    // Reset alerts
    activeAlerts = { lowStock: [], expiringSoon: [], expired: [] };
    
    // ⚡ OPTIMIZED: Only 2 database queries instead of 134+
    const [allMedicines, allBatches] = await Promise.all([
      Medicine.find({}).lean(),
      Batch.find({ quantity: { $gt: 0 } }).lean()
    ]);
    
    // Build a medicine lookup map by ID
    const medMap = {};
    for (const med of allMedicines) {
      medMap[med._id.toString()] = med;
    }
    
    // Process all batches in memory (no extra DB calls)
    for (const batch of allBatches) {
      const medicine = medMap[batch.medicine?.toString()];
      if (!medicine) continue;
      
      // LOW STOCK check
      if (batch.quantity < medicine.minimumStock) {
        activeAlerts.lowStock.push({
          medicine: medicine.name,
          batchNumber: batch.batchNumber,
          location: batch.location,
          currentQuantity: batch.quantity,
          minimumStock: medicine.minimumStock,
          deficit: medicine.minimumStock - batch.quantity,
          medicineId: medicine._id,
          batchId: batch._id,
          price: medicine.price,
          category: medicine.category
        });
      }
      
      // EXPIRY check
      if (batch.expiryDate) {
        const daysToExpiry = Math.ceil((new Date(batch.expiryDate) - now) / (1000 * 60 * 60 * 24));
        
        if (daysToExpiry <= 30 && daysToExpiry > 0) {
          activeAlerts.expiringSoon.push({
            medicine: medicine.name,
            batchNumber: batch.batchNumber,
            location: batch.location,
            quantity: batch.quantity,
            price: medicine.price,
            expiryDate: batch.expiryDate,
            daysLeft: daysToExpiry,
            batchId: batch._id
          });
        }
        
        if (daysToExpiry <= 0) {
          activeAlerts.expired.push({
            medicine: medicine.name,
            batchNumber: batch.batchNumber,
            location: batch.location,
            quantity: batch.quantity,
            price: medicine.price,
            expiryDate: batch.expiryDate,
            daysExpired: Math.abs(daysToExpiry),
            batchId: batch._id
          });
        }
      }
    }
    
    return activeAlerts;
    
  } catch (error) {
    console.error('❌ Alert check error:', error);
    return activeAlerts;
  }
}

// ============ GET ALL ALERTS ============
router.get("/alerts", auth, async (req, res) => {
  try {
    // Check alerts in real-time when endpoint is called
    const alerts = await checkAlertsRealTime();
    
    res.json({
      success: true,
      timestamp: new Date(),
      alerts,
      counts: {
        lowStock: alerts.lowStock.length,
        expiringSoon: alerts.expiringSoon.length,
        expired: alerts.expired.length
      },
      message: "Real-time alerts from current database state"
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ============ MANUAL ALERT CHECK ============
router.post("/check-alerts", auth, async (req, res) => {
  try {
    const alerts = await checkAlertsRealTime();
    
    res.json({
      success: true,
      message: "Real-time alert check completed",
      timestamp: new Date(),
      alerts,
      summary: `Found ${alerts.lowStock.length} low stock, ${alerts.expiringSoon.length} expiring soon, ${alerts.expired.length} expired`
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ DASHBOARD SUMMARY ============
router.get("/dashboard", auth, async (req, res) => {
  try {
    const Medicine = mongoose.model('Medicine');
    const Batch = mongoose.model('Batch');
    const Location = mongoose.model('Location');
    const Bill = mongoose.model('Bill');
    
    // Get ALL real data in parallel
    const [
      medicines,
      batches,
      freeLocations,
      recentBills,
      lowStockMedicines,
      expiringBatches,
      todayBills,
      stockValueResult
    ] = await Promise.all([
      Medicine.countDocuments(),
      Batch.countDocuments(),
      Location.countDocuments({ isOccupied: false }),
      Bill.find().sort({ createdAt: -1 }).limit(10).lean(),
      Medicine.find({
        $expr: { $lt: ["$totalStock", "$minimumStock"] }
      }).lean(),
      Batch.find({
        expiryDate: { $lte: new Date(Date.now() + 30*86400000), $gt: new Date() },
        quantity: { $gt: 0 }
      }).populate('medicine', 'name').limit(10).lean(),
      Bill.find({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }).lean(),
      Batch.aggregate([
        { $match: { quantity: { $gt: 0 } } },
        { $lookup: { from: 'medicines', localField: 'medicine', foreignField: '_id', as: 'med' } },
        { $unwind: { path: '$med', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', { $ifNull: ['$med.price', 0] }] } } } }
      ])
    ]);
    
    const stockValue = stockValueResult[0]?.total || 0;
    const todaySales = todayBills.reduce((total, bill) => total + (bill.totalAmount || 0), 0);
    
    res.json({
      success: true,
      timestamp: new Date(),
      summary: {
        // Counts
        totalMedicines: medicines,
        totalBatches: batches,
        freeLocations: freeLocations,
        lowStockAlerts: lowStockMedicines.length,
        expiringSoon: expiringBatches.length,
        
        // Financial
        totalStockValue: stockValue,
        todaySales: todaySales,
        todayTransactions: todayBills.length,
        
        // Recent activity
        recentBills: recentBills.length
      },
      
      // Detailed alerts
      alerts: {
        lowStock: lowStockMedicines.map(m => ({
          name: m.name,
          current: m.totalStock,
          minimum: m.minimumStock,
          deficit: m.minimumStock - m.totalStock,
          category: m.category
        })),
        
        expiringSoon: expiringBatches.map(b => ({
          medicine: b.medicine?.name || 'Unknown',
          batch: b.batchNumber,
          location: b.location,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          daysLeft: Math.ceil((b.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
        })),
        
        recentSales: recentBills.map(b => ({
          billNumber: b.billNumber || `BILL-${b._id}`,
          customer: b.customerName || 'Walk-in',
          amount: b.totalAmount || 0,
          items: b.items?.length || 0,
          time: b.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ============ GET MEDICINE WITH LOCATIONS ============
router.get("/medicine-locations/:medicineName", auth, async (req, res) => {
  try {
    const medicineName = req.params.medicineName;
    
    const Medicine = mongoose.model('Medicine');
    const Batch = mongoose.model('Batch');
    
    // Find medicine
    const medicine = await Medicine.findOne({ 
      name: { $regex: new RegExp(medicineName, 'i') } 
    });
    
    if (!medicine) {
      return res.status(404).json({ 
        success: false,
        error: "Medicine not found" 
      });
    }
    
    // Find all batches for this medicine
    const batches = await Batch.find({ 
      medicine: medicine._id,
      quantity: { $gt: 0 }
    }).sort({ expiryDate: 1 });
    
    // Prepare location data
    const locations = batches.map(batch => ({
      location: batch.location,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      daysLeft: Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    }));
    
    res.json({
      success: true,
      medicine: {
        name: medicine.name,
        price: medicine.price,
        totalStock: medicine.totalStock,
        minimumStock: medicine.minimumStock,
        status: medicine.totalStock < medicine.minimumStock ? 'LOW STOCK' : 'OK'
      },
      locations,
      totalBatches: batches.length,
      message: `Found ${locations.length} locations for ${medicine.name}`
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;