const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true  // Regular index for exact/prefix match
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalStock: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumStock: {
    type: Number,
    default: 10
  },
  category: String,
  manufacturer: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for partial-word search with $text operator
medicineSchema.index({ name: "text" });

module.exports = mongoose.model("Medicine", medicineSchema);