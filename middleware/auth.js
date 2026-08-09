const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mibc_super_secret_key_2026';

const verifyToken = (req, res, next) => {
    // Frontend se token aayega header mein
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
    }

    try {
        // "Bearer [token]" format se token nikalna
        const actualToken = token.split(" ")[1];
        
        // Token ko verify karna
        const verified = jwt.verify(actualToken, JWT_SECRET);
        req.user = verified; // User ka data request me save kar diya
        next(); // Token sahi hai, aage badho
    } catch (err) {
        res.status(400).json({ success: false, message: 'Invalid or Expired Token.' });
    }
};

module.exports = verifyToken;