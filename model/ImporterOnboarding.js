const mongoose = require('mongoose');

const importerSchema = new mongoose.Schema({
    firm: { type: String, required: true },
    person: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    hq: { type: String },
    
    // Q1 - Q4: Licences and Reach
    q1_fssai: { type: String, required: true },
    q2_states: [{ type: String, required: true }],
    q2_other: { type: String },
    q3_registrations: { type: String, required: true },
    q4_warehouse: { type: String, required: true },

    // Q5 - Q8: Portfolio and Channel
    q5_portfolio: [{ type: String, required: true }],
    q6_agaveBrands: { type: String, required: true },
    q7_channels: [{ type: String, required: true }],
    q8_priceTiers: [{ type: String, required: true }],

    // Q9 - Q15: What You Seek
    q9_onboardCount: { type: String, required: true },
    q10_exclusivity: { type: String, required: true },
    q11_firstOrder: { type: String, required: true },
    q12_paymentTerms: [{ type: String, required: true }],
    q13_marketingModel: { type: String, required: true },
    q14_timeline: { type: String, required: true },
    q14b_tastingEvening: { type: String, required: true },
    q15_specifics: { type: String }

}, { timestamps: true });

module.exports = mongoose.model('ImporterOnboarding', importerSchema);