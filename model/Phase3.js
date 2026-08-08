const mongoose = require('mongoose');

const phase3Schema = new mongoose.Schema({
    company: { type: String, required: true },
    person: { type: String, required: true },
    email: { type: String, required: true },
    
    // Q1: Price Commitments
    priceCommitment: { type: String, required: true },
    priceCap: { type: String },
    
    // Q2: FOB Pricing
    fob100: { type: Number, required: true },
    fob300: { type: Number, required: true },
    fob1000: { type: Number, required: true },
    
    // Q3: Payment Instruments (Checkboxes save as Array)
    paymentInstruments: [{ type: String }],
    advancePercent: { type: Number },
    
    // Q4: Credit Insurance
    creditInsurance: { type: String, required: true },
    insuranceName: { type: String },
    
    // Q5: Budget Share
    budgetShare: { type: String, required: true },
    
    // Q6: Freight
    freightArranger: { type: String },
    forwarderName: { type: String },
    
    // Q7: Tasting Evening Allocation
    allocationBottles: { type: Number },
    allocationSKUs: { type: String },
    allocationDate: { type: Date }
    
}, { timestamps: true });

module.exports = mongoose.model('Phase3Submission', phase3Schema);