// tauilaRegistration.js schema aesa dikhna chahiye:
const mongoose = require("mongoose");

const tequilaSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  country: { type: String, required: true },
  website: { type: String },
  productType: { type: String, required: true },
  crtCertified: { type: String, required: true },
  
  fullName: { type: String, required: true },
  position: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  preference: { type: String, required: true },
  hearAboutUs: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("TequilaInterest", tequilaSchema);