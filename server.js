const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const { Resend } = require("resend"); // Resend Library
const Membership = require("./model/Membership");


const app = express();
const resend = new Resend(process.env.RESEND_API_KEY); // API Key

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

/* -------------------- MEMBERSHIP API (OPTIMIZED) -------------------- */
app.post("/api/membership", async (req, res) => {
  try {
    console.log("📩 Received Request:", req.body);

    const { selectedPlan, contactName, contactPhone, contactEmail, companyName, contactMessage } = req.body;

    // Validation
    if (!contactName || !contactEmail || !contactPhone) {
      return res.status(400).json({ success: false, error: "Please fill all required fields." });
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

    // 🚀 FAST RESPONSE: User ko turant success bol do
    res.status(200).json({ success: true, message: "Application submitted successfully! Check your email." });

    // --- EMAIL LOGIC (BACKGROUND PROCESS) ---
    // Isko bina 'await' ke Promise.all me daal diya taaki ye piche chalta rahe

    const adminEmailPromise = resend.emails.send({
        from: 'MIBC Admin <onboarding@resend.dev>', // Testing Sender
        to: process.env.ADMIN_EMAIL || 'ashish6266mehra@gmail.com', // Aapka verified email
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
        `
    });

    const userEmailPromise = resend.emails.send({
        from: 'MIBC Team <onboarding@resend.dev>',
        to: contactEmail, // User ka email
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
        `
    });

    // Run both emails in parallel without making the user wait
    Promise.allSettled([adminEmailPromise, userEmailPromise])
        .then((results) => {
            console.log("✅ Background Emails Processed");
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`⚠️ Email ${index === 0 ? 'Admin' : 'User'} Failed:`, result.reason);
                }
            });
        });

  } catch (error) {
    console.error("❌ Server Error:", error);
    // Sirf tab error bhejo agar response abhi tak nahi gaya hai
    if (!res.headersSent) {
        return res.status(500).json({ success: false, error: "Internal server error. Please try again." });
    }
  }
});

/* -------------------- CONTACT API (OPTIMIZED) -------------------- */
app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: "Please fill all required fields." });
    }

    // 🚀 FAST RESPONSE
    res.status(200).json({ success: true, message: "Message sent successfully." });

    // Send Email to Admin via Resend (Background)
    resend.emails.send({
        from: 'MIBC Contact <onboarding@resend.dev>',
        to: process.env.ADMIN_EMAIL || 'ashish6266mehra@gmail.com',
        subject: `New Contact: ${subject || 'General Inquiry'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #D4AF37;">New Contact Form Submission</h2>
            <hr>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone}</p>
            <p><b>Message:</b> ${message}</p>
          </div>
        `
    })
    .then(() => console.log("✅ Contact Email Sent via Resend"))
    .catch((err) => console.error("❌ Contact Email Failed:", err));

  } catch (error) {
    console.error("❌ Contact Error:", error);
    if (!res.headersSent) {
        return res.status(500).json({ success: false, error: "Failed to send message." });
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
  console.log(`\n🚀 Server running on port ${PORT}\n`);
});