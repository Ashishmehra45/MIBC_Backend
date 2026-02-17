const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema({
  selectedPlan: String,
  name: String,
  phone: String,
  email: String,
  company: String,
  message: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("MIBC_Membership", membershipSchema);
