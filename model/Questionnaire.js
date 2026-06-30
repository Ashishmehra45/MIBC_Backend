const mongoose = require('mongoose');

const questionnaireSchema = new mongoose.Schema({
  // STEP A: Company
  companyName: { type: String },
  brandName: { type: String },
  yearEstablished: { type: String },
  website: { type: String },
  hqLocation: { type: String },
  contactName: { type: String },
  contactTitle: { type: String },
  phone: { type: String },
  email: { type: String },

  // STEP B: Product
  productCategory: { type: String },
  skusList: { type: String },
  productImage: { type: String }, // Cloudinary URL save hoga
  brandDeck: { type: String },    // Cloudinary URL save hoga

  // STEP C: Certification
  crtStatus: { type: String },
  exportDocsStatus: { type: String },
  crtCertificate: { type: String }, // Cloudinary URL save hoga

  // STEP D: Production
  productionCapacity: { type: String },
  exportCapacityShare: { type: String },
  commitFirstOrder: { type: String },
  leadTime: { type: String },

  // STEP E: Export
  exportCountriesCount: { type: String },
  currentExportMarkets: { type: String },
  customsBrokerRel: { type: String },
  cifQuoteAbility: { type: String },

  // STEP F: Pricing
  fobPrice: { type: String },
  packagingAdjustment: { type: String },

  // STEP G: Financial
  investmentCapacity: { type: String },
  paymentTermsComfort: { type: String },
  sampleSupply: { type: String },
  marketTimelineCommitment: { type: String },

  // STEP H: Branding
  brandStory: { type: String },
  marketingMaterialsEnglish: { type: String },
  socialMediaActive: { type: String },
  founderEngagement: { type: String },
  tradeEvents: { type: String },

  // STEP I: Declaration
  programTrack: { type: String }, // <-- NEW ADDITION HERE
  agreedToTerms: { type: Boolean, default: false },
  declarationName: { type: String },
  declarationDate: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Questionnaire', questionnaireSchema);