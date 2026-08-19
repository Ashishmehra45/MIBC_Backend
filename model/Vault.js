const mongoose = require("mongoose");

// 1. Folder Schema
const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentId: { 
    type: String, 
    default: 'root' // 'root' matlab main directory, warna parent folder ki ID
  }
}, { timestamps: true });

// 2. File Schema
const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // mimetype (e.g., 'application/pdf')
  size: { type: String, required: true }, // e.g., '2.4 MB'
  url: { type: String, required: true },  // Cloudinary URL
  folderId: { 
    type: String, 
    default: 'root' // Kis folder ke andar hai
  }
}, { timestamps: true });

const VaultFolder = mongoose.model("VaultFolder", folderSchema);
const VaultFile = mongoose.model("VaultFile", fileSchema);

module.exports = { VaultFolder, VaultFile };