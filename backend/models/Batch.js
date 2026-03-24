const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine"
  },
  batchNumber: String,
  quantity: Number,
  location: String  // NO unique: true here!
}, { 
  timestamps: true,
  strict: false
});

// Compound index for filtering batches by medicine and expiry date
batchSchema.index({ medicine: 1, expiryDate: 1 });

// Index for location-based queries
batchSchema.index({ location: 1 });

module.exports = mongoose.model("Batch", batchSchema);