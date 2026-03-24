const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true  // Unique index already defined
  },
  isOccupied: {
    type: Boolean,
    default: false
  },
  currentBatchId: String, // Store as String, not ObjectId
  medicineName: String,
  batchNumber: String,
  expiryDate: Date,
  quantity: Number,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Index for finding free/occupied locations
locationSchema.index({ isOccupied: 1 });

// Method to self-heal
locationSchema.methods.verifyOccupation = async function() {
  const Batch = mongoose.model('Batch');
  
  if (this.isOccupied && this.currentBatchId) {
    const batch = await Batch.findById(this.currentBatchId);
    if (!batch || batch.quantity === 0) {
      // Auto-fix: Location should be free
      this.isOccupied = false;
      this.currentBatchId = null;
      this.medicineName = "";
      this.batchNumber = "";
      this.quantity = 0;
      await this.save();
    }
  }
};

module.exports = mongoose.model("Location", locationSchema);