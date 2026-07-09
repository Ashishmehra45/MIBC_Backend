// models/IntentForm.js
const mongoose = require('mongoose');

const intentFormSchema = new mongoose.Schema({
  // Before We Begin
  email: { type: String, required: true },

  // Part 1: Your India Play
  leadSKU: { type: String, required: true },
  shelfPositionAmbition: { type: String, required: true },
  indiaThesis: { type: String, required: true },

  // Part 2: Priority & Ambition
  priorityLaunchMarket: [{ type: String }], // Array for multiple checkboxes
  firstChannelFocus: { type: String, required: true },
  targetFirstShipment: { type: String, required: true },
  year1VolumeAmbition: { type: String, required: true },
  distributionPreference: { type: String, required: true },

  // Part 3: Your India Footprint Today
  existingConversations: { type: String, required: true },
  reachedIndiaBefore: { type: String, required: true },
  reachedIndiaDetails: { type: String }, // Optional
  indiaTrademarkStatus: { type: String, required: true },

  // Part 4: Four facts
  abvLeadSKU: { type: String, required: true },
  brandOwnership: { type: String, required: true },
  exportingEntity: { type: String, required: true },
  satPadron: { type: String, required: true },

  // Part 5: Label and Pack
  canRun750ml: { type: String, required: true },
  labelArtworkSource: { type: String, required: true },
  overLabelConstraints: { type: String }, // Optional

  // Part 6: The Room
  indiaOwner: { type: String, required: true },
  additionalInfo: { type: String } // Optional

}, { timestamps: true });

module.exports = mongoose.model('IntentForm', intentFormSchema);