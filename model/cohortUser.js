const mongoose = require('mongoose');

const cohortUserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    companyName: { type: String, required: true },
    brandName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true } // Backend mein isko save karne se pehle hash karenge
}, { timestamps: true });

module.exports = mongoose.model('CohortUser', cohortUserSchema);