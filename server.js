const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const sgMail = require("@sendgrid/mail");
const Membership = require("./model/Membership");

const app = express();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://localhost:5000',
      'http://localhost:5001',
      'https://mexicoindia.org',
      'https://www.mexicoindia.org'
    ];
    if (!origin || origin === 'null' || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------- MONGODB CONNECTION -------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

/* -------------------- TEST ENDPOINT -------------------- */
app.get('/', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

/* -------------------- MEMBERSHIP API -------------------- */
app.post("/api/membership", async (req, res) => {
  try {
    const { selectedPlan, contactName, contactPhone, contactEmail, companyName, contactMessage } = req.body;

    if (!contactName || !contactEmail || !contactPhone) {
      return res.status(400).json({ success: false, error: "Please fill all required fields." });
    }

    const newEntry = await Membership.create({
      selectedPlan: selectedPlan || "Not Specified",
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      company: companyName || "N/A",
      message: contactMessage || "N/A",
    });

    console.log("✅ Saved to DB:", newEntry._id);

    res.status(200).json({
      success: true,
      message: "Application submitted successfully! Check your email."
    });

    // Admin Email
    const adminEmail = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.SENDER_EMAIL,
      subject: `New Membership: ${selectedPlan} - ${contactName}`,
      html: `
        <div style="font-family: Arial; padding:20px;">
          <h2>New Membership Application</h2>
          <p><b>Plan:</b> ${selectedPlan}</p>
          <p><b>Name:</b> ${contactName}</p>
          <p><b>Email:</b> ${contactEmail}</p>
          <p><b>Phone:</b> ${contactPhone}</p>
          <p><b>Company:</b> ${companyName || "N/A"}</p>
          <p><b>Message:</b> ${contactMessage || "N/A"}</p>
        </div>
      `
    };

    // User Confirmation Email
// User Confirmation Email
   // User Confirmation Email - REPLACE THIS BLOCK
    const userEmail = {
      to: contactEmail,
      from: {
        name: "MIBC Team", // Isse 'info' hat jayega
        email: process.env.SENDER_EMAIL
      },
      subject: "México-India Business Council - Application Received",
      html: `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Georgia', serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ffffff; border-bottom: 3px solid #D4AF37; padding: 30px; text-align: center;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">México–India Business Council</h1>
              <p style="color: #7f8c8d; font-style: italic; margin: 5px 0 0 0;">Bridging Two Emerging Giants</p>
            </div>
            <div style="padding: 40px; color: #2c3e50;">
              <p style="font-size: 18px; font-weight: bold;">Dear ${contactName},</p>
              <p style="font-size: 16px; line-height: 1.6;">Thank you for submitting your membership application. We confirm that your application has been received and is currently under review.</p>
              <p style="font-size: 16px; line-height: 1.6;">Our team will respond to you within <b>24 to 48 hours</b>.</p>
              <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                <p style="margin: 0; font-size: 16px;">Warm regards,</p>
                <p style="margin: 0; color: #D4AF37; font-size: 18px; font-weight: bold;">MIBC Team</p>
              </div>
            </div>
          </div>
        </div>
      `
    };
    Promise.allSettled([
      sgMail.send(adminEmail),
      sgMail.send(userEmail)
    ])
      .then(() => console.log("✅ Emails Processed"))
      .catch(err => console.error("❌ Email Error:", err));

  } catch (error) {
    console.error("❌ Server Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
});

/* -------------------- CONTACT API -------------------- */
app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "Please fill all required fields." });
    }

    res.status(200).json({ success: true, message: "Message sent successfully." });

    const contactEmailData = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.SENDER_EMAIL,
      subject: `New Contact: ${subject || 'General Inquiry'}`,
      html: `
        <div style="font-family: Arial; padding:20px;">
          <h2>New Contact Form Submission</h2>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Phone:</b> ${phone}</p>
          <p><b>Message:</b> ${message}</p>
        </div>
      `
    };

    sgMail.send(contactEmailData)
      .then(() => console.log("✅ Contact Email Sent"))
      .catch(err => console.error("❌ Contact Email Failed:", err));

  } catch (error) {
    console.error("❌ Contact Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Failed to send message." });
    }
  }
});

/* -------------------- ADMIN FETCH API -------------------- */
app.get("/api/admin/memberships", async (req, res) => {
  try {
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
  console.log(`🚀 Server running on port ${PORT}`);
});
