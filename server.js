const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const Membership = require("./model/Membership");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://mexicoindia.org',
    'https://www.mexicoindia.org'
  ],
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
}));

// Handle preflight requests
// app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


/* -------------------- MONGODB CONNECTION -------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

/* -------------------- EMAIL TRANSPORTER -------------------- */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) console.error("❌ Email Error:", error);
  else console.log("✅ Email Ready");
});

/* -------------------- TEST ENDPOINT -------------------- */
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running!', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    cors: 'enabled' 
  });
});

/* -------------------- MEMBERSHIP API -------------------- */
app.post("/api/membership", async (req, res) => {
  try {
    console.log("📩 Received Request:", req.body);

    const {
      selectedPlan,
      contactName,
      contactPhone,
      contactEmail,
      companyName,
      contactMessage,
    } = req.body;

    // Validation
    if (!contactName || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        error: "Please fill all required fields.",
      });
    }

    // Save to Database
    const newEntry = await Membership.create({
      selectedPlan: selectedPlan || "Not Specified",
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      company: companyName || "N/A",
      message: contactMessage || "N/A",
    });

    console.log("✅ Saved to DB:", newEntry._id);

    // Send Emails
    try {
      await Promise.all([
        // Admin Email
        transporter.sendMail({
          from: `"MIBC Admin" <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL || "ashish6266mehra@gmail.com",
          subject: `New Membership: ${selectedPlan} - ${contactName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #D4AF37;">New Membership Application</h2>
              <hr>
              <p><b>Plan:</b> ${selectedPlan}</p>
              <p><b>Name:</b> ${contactName}</p>
              <p><b>Email:</b> ${contactEmail}</p>
              <p><b>Phone:</b> ${contactPhone}</p>
              <p><b>Company:</b> ${companyName || "N/A"}</p>
              <p><b>Message:</b> ${contactMessage || "N/A"}</p>
              <hr>
              <small>Received: ${new Date().toLocaleString()}</small>
            </div>
          `,
        }),
        
        // User Confirmation Email
        transporter.sendMail({
          from: `"MIBC Team" <${process.env.EMAIL_USER}>`,
          to: contactEmail,
          subject: "México-India Business Council - Application Received",
          html: `
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 0; background-color: #f9f9f9;">
              <div style="font-family: 'Arial', serif; padding: 40px; max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px;">
                <div style="border-bottom: 2px solid #D4AF37; padding-bottom: 15px; margin-bottom: 25px; text-align: center;">
                  <h2 style="color: #D4AF37; margin: 0; font-size: 28px; letter-spacing: 2px;">
                    México–India Business Council
                  </h2>
                  <p style="font-style: italic; color: #7f8c8d; margin: 8px 0 0 0; font-size: 16px;">
                    Bridging Two Emerging Giants
                  </p>
                </div>
                
                <p style="font-size: 18px; color: #2c3e50; font-weight: 600;">Dear ${contactName},</p>
                
                <p style="font-size: 17px; color: #34495e; line-height: 1.6;">
                  Thank you for submitting your membership application to the <strong>México–India Business Council</strong>. 
                  We confirm that your application has been received and is currently under review.
                </p>
                
                <p style="font-size: 17px; color: #34495e; line-height: 1.6;">
                  Our team will respond to you within <strong>24 to 48 hours</strong>. 
                  Should any additional information be required, we will be pleased to connect with you.
                </p>
                
                <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
                  <p style="font-size: 17px; margin: 0; color: #2c3e50;">
                    Warm regards,<br>
                    <strong style="color: #D4AF37; font-size: 20px;">México-India Business Council</strong>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      ]);
      
      console.log("✅ Emails Sent");
    } catch (mailError) {
      console.error("⚠️ Email Failed:", mailError.message);
    }

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Application submitted successfully! Check your email.",
    });

  } catch (error) {
    console.error("❌ Server Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error. Please try again.",
    });
  }
});

/* -------------------- CONTACT API -------------------- */
app.post("/api/contact", async (req, res) => {
  try {
    console.log("📩 Contact Request:", req.body);

    const {
      name,
      phone,
      email,
      subject,
      message,
    } = req.body;

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Please fill all required fields.",
      });
    }

    // Send Email to Admin
    try {
      await transporter.sendMail({
        from: `"MIBC Contact Form" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || "ashish6266mehra@gmail.com",
        subject: `New Contact Form: ${subject || 'General Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #D4AF37;">New Contact Form Submission</h2>
            <hr>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone || "N/A"}</p>
            <p><b>Subject:</b> ${subject || "General Inquiry"}</p>
            <p><b>Message:</b> ${message}</p>
            <hr>
            <small>Received: ${new Date().toLocaleString()}</small>
          </div>
        `,
      });

      console.log("✅ Contact Email Sent");
    } catch (mailError) {
      console.error("⚠️ Email Failed:", mailError.message);
    }

    // Success Response
    return res.status(200).json({
      success: true,
      message: "Thank you! Your message has been sent successfully.",
    });

  } catch (error) {
    console.error("❌ Contact Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send message. Please try again.",
    });
  }
});

app.get("/api/admin/memberships", async (req, res) => {
  try {
    // Database se saari entries fetch karein (Latest first)
    const members = await Membership.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    res.status(500).json({ success: false, error: "Data fetch nahi ho paya" });
  }
});

/* -------------------- SERVER START -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}\n`);
});
