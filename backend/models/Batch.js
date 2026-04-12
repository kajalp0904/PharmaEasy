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

// ===== PERMANENT STOCK SYNC =====
// After EVERY batch save, recalculate Medicine.totalStock from real batch data.
batchSchema.post('save', async function () {
  try {
    const Batch = mongoose.model('Batch');
    const Medicine = mongoose.model('Medicine');
    // Use explicit ObjectId cast to avoid type mismatch in aggregate
    const medId = new mongoose.Types.ObjectId(this.medicine.toString());
    const result = await Batch.aggregate([
      { $match: { medicine: medId } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const total = result[0]?.total || 0;
    await Medicine.findByIdAndUpdate(medId, { $set: { totalStock: total } });
  } catch (err) {
    console.error('⚠️  Stock sync error:', err.message);
  }
});

module.exports = mongoose.model("Batch", batchSchema);