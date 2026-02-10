const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const helmet = require("helmet");
require("dotenv").config();


const Membership = require("./model/Membership");

const app = express();

/* -------------------- 1. MIDDLEWARE -------------------- */
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "https://mexicoindia.org", // Aapka production domain
  process.env.CLIENT_URL, // Dashboard variable
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Agar origin nahi hai (jaise server-to-server logs) ya allowed list mein hai
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Debugging ke liye console log lagaya hai taki Render logs mein dikhe block kyu hua
        console.log("CORS Blocked for origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200, // Older browsers ke liye zaroori hai
  }),
);

app.use(helmet());
app.use(express.json());

/* -------------------- 2. MONGODB CONNECTION -------------------- */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🚀 MongoDB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

/* -------------------- 3. EMAIL TRANSPORTER (FIXED) -------------------- */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    family: 4 // force IPv4
  }
});

transporter.verify((error, success) => {
  if (error) console.error("❌ Email Transporter Error:", error);
  else console.log("📧 Email Server is ready to send messages");
});

app.post("/api/membership", async (req, res) => {
  try {
    const {
      selectedPlan,
      contactName,
      contactPhone,
      contactEmail,
      companyName,
      contactMessage,
    } = req.body;

    // 1. Validation
    if (!contactName || !contactEmail || !contactPhone) {
      return res.status(400).json({
        success: false,
        error: "Please fill all mandatory fields.",
      });
    }

    // 2. Save to DB (Wait for it)
    const newEntry = await Membership.create({
      selectedPlan: selectedPlan || "Not Specified",
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      company: companyName,
      message: contactMessage,
    });

    // 3. Send Emails (Use Try-Catch separately for Emails so main process doesn't fail)
    try {
      // Dono emails ko parallel mein bhejna fast hota hai
      await Promise.all([
        // Admin Email
        transporter.sendMail({
          from: `"MIBC Admin" <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL || "ashish6266mehra@gmail.com",
          subject: `New Lead: ${selectedPlan} - ${contactName}`,
          html: ``,
        }),
        // User Email
        transporter.sendMail({
          from: `"MIBC Team" <${process.env.EMAIL_USER}>`,
          to: contactEmail,
          subject: `Acknowledgement - México-India Business Council`,
          html: ``,
        })
      ]);
    } catch (mailError) {
      console.error("❌ Mail Sending Failed:", mailError);
      // Yahan hum response return nahi karenge, kyunki data DB mein save ho chuka hai
    }

    // 4. Final Success Response
    return res.status(201).json({
      success: true,
      message: "Application submitted successfully!",
    });

  } catch (error) {
    console.error("❌ Critical Server Error:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error. Our team is looking into it.",
    });
  }
});

/* -------------------- 5. SERVER START -------------------- */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
