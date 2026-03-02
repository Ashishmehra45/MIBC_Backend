const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        // Optional: Adding a basic regex for phone validation
        match: [/^[0-9+\s-]{10,15}$/, 'Please enter a valid phone number']
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        lowercase: true,
        trim: true,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email address']
    },
    subject: {
        type: String,
        required: false,
        trim: true,
        
        default: 'General Inquiry'
    },
    message: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
       
    }
}, {
    // This automatically creates 'createdAt' and 'updatedAt' fields
    timestamps: true 
});

// Create and Export the Model
const Contact = mongoose.model('Query', contactSchema);

module.exports = Contact;