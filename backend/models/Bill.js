const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  items: [
    {
      medicineName: String,
      batchNumber: String,
      quantitySold: Number,
      price: Number
    }
  ],
  totalAmount: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Bill", billSchema);
