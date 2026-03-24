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
  console.log('🔔 Checking alerts in real-time...');
  
  try {
    const Medicine = mongoose.model('Medicine');
    const Batch = mongoose.model('Batch');
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    // Reset alerts
    activeAlerts = {
      lowStock: [],
      expiringSoon: [],
      expired: []
    };
    
    // 1. Check LOW STOCK (real data from database)
    const allMedicines = await Medicine.find({});
    
    for (const medicine of allMedicines) {
      // Get all batches for this medicine
      const medicineBatches = await Batch.find({ 
        medicine: medicine._id,
        quantity: { $gt: 0 }
      });
      
      // Check each batch against medicine's minimumStock
      for (const batch of medicineBatches) {
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
      }
    }
    
    // 2. Check EXPIRING SOON (real batches from database)
    const batches = await Batch.find({
      quantity: { $gt: 0 }
    }).populate('medicine', 'name price');
    
    for (const batch of batches) {
      if (batch.expiryDate) {
        const daysToExpiry = Math.ceil((batch.expiryDate - now) / (1000 * 60 * 60 * 24));
        
        // Expiring in next 30 days
        if (daysToExpiry <= 30 && daysToExpiry > 0) {
          activeAlerts.expiringSoon.push({
            medicine: batch.medicine.name,
            batchNumber: batch.batchNumber,
            location: batch.location,
            quantity: batch.quantity,
            price: batch.medicine.price,
            expiryDate: batch.expiryDate,
            daysLeft: daysToExpiry,
            batchId: batch._id
          });
        }
        
        // Already expired
        if (daysToExpiry <= 0) {
          activeAlerts.expired.push({
            medicine: batch.medicine.name,
            batchNumber: batch.batchNumber,
            location: batch.location,
            quantity: batch.quantity,
            price: batch.medicine.price,
            expiryDate: batch.expiryDate,
            daysExpired: Math.abs(daysToExpiry),
            batchId: batch._id
          });
        }
      }
    }
    
    console.log(`📊 Real-time alerts: Low stock: ${activeAlerts.lowStock.length}, Expiring: ${activeAlerts.expiringSoon.length}, Expired: ${activeAlerts.expired.length}`);
    
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
      lowStockMedicines
    ] = await Promise.all([
      Medicine.countDocuments(),
      Batch.countDocuments(),
      Location.countDocuments({ isOccupied: false }),
      Bill.find().sort({ createdAt: -1 }).limit(10),
      Medicine.find({
        $expr: { $lt: ["$totalStock", "$minimumStock"] }
      })
    ]);
    
    // Calculate expiring batches
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringBatches = await Batch.find({
      expiryDate: { 
        $lte: thirtyDaysFromNow,
        $gt: new Date()
      },
      quantity: { $gt: 0 }
    }).populate('medicine', 'name').limit(10);
    
    // Calculate total value of stock
    const allBatches = await Batch.find({ quantity: { $gt: 0 } })
      .populate('medicine', 'name price');
    
    const stockValue = allBatches.reduce((total, batch) => {
      return total + (batch.quantity * (batch.medicine?.price || 0));
    }, 0);
    
    // Calculate today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayBills = await Bill.find({
      createdAt: { $gte: today }
    });
    
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