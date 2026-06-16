// tauilaRegistration.js schema aesa dikhna chahiye:
const mongoose = require("mongoose");

const tequilaSchema = new mongoose.Schema({
 
  
  fullName: { type: String, required: true },
  position: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  preference: { type: String, required: true },
  
}, { timestamps: true });

module.exports = mongoose.model("TequilaInterest", tequilaSchema);