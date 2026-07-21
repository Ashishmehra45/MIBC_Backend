const mongoose = require('mongoose');

const phase2Schema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true,
        trim: true
    },
    impi_number: { 
        type: String, 
        required: true 
    },
    impi_status: { 
        type: String, 
        required: true 
    },
    convenio: { 
        type: String, 
        required: true 
    },
    caet: { 
        type: String, 
        required: true 
    },
    coa: { 
        type: String, 
        required: true 
    },
    padron: { 
        type: String, 
        required: true 
    },
    artwork_sent: { 
        type: String, 
        required: true 
    },
    label_has: { 
        type: [String], // Array to store multiple checkbox values
        default: [] 
    },
    rear_space: { 
        type: String, 
        required: true 
    },
    proof_link: { 
        type: String, 
        trim: true 
    },
    home_volume: { 
        type: String, 
        required: true 
    },
    gsrp: { 
        type: String, 
        required: true 
    },
    india_quoted: { 
        type: String, 
        required: true 
    },
    notes: { 
        type: String, 
        trim: true 
    }
}, { timestamps: true });

const Phase2 = mongoose.model('Phase2', phase2Schema);

module.exports = Phase2;