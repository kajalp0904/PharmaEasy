const express = require("express");
const router = express.Router();
const Location = require("../models/Location");
const auth = require("../middleware/auth");

// Create all 100 locations (ONE TIME)
router.post("/init-locations", auth, async (req, res) => {
  try {
    const count = await Location.countDocuments();
    if (count > 0) {
      return res.status(200).json({ 
        success: true,
        message: "Locations already exist", 
        count 
      });
    }

    let locations = [];
    for (let shelf = 1; shelf <= 20; shelf++) {
      for (let rack = 1; rack <= 5; rack++) {
        locations.push({
          code: `S${shelf}-R${rack}`,
          isOccupied: false
        });
      }
    }

    await Location.insertMany(locations);
    
    res.status(201).json({ 
      success: true,
      message: "100 locations created successfully",
      count: 100
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all locations
router.get("/locations", auth, async (req, res) => {
  try {
    const locations = await Location.find().sort({ code: 1 });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Clear all locations (for testing)
router.delete("/clear-locations", auth, async (req, res) => {
  try {
    await Location.deleteMany({});
    res.json({ 
      success: true, 
      message: "All locations cleared" 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ========== GET free locations (matches frontend expectation) ==========
// GET /api/locations/free
router.get("/locations/free", auth, async (req, res) => {
  try {
    const freeLocations = await Location.find({ isOccupied: false }).sort({ code: 1 });
    res.json(freeLocations);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;