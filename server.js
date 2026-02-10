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
        error: "fill all mandatory fields: name, email, phone",
      });
    }

    // 2. Save to DB
    await Membership.create({
      selectedPlan: selectedPlan || "Not Specified",
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      company: companyName,
      message: contactMessage,
    });

    // 3. Dual Email Logic (Admin + User)

    await transporter.sendMail({
      from: `"MIBC Admin" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || "ashish6266mehra@gmail.com",
      subject: `New Lead: ${selectedPlan} - ${contactName}`,
      html: `
          <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #007bff;">New Membership Application</h2>
            <hr>
            <p><b>Plan Selected:</b> ${selectedPlan}</p>
            <p><b>Name:</b> ${contactName}</p>
            <p><b>Email:</b> ${contactEmail}</p>
            <p><b>Phone:</b> ${contactPhone}</p>
            <p><b>Company:</b> ${companyName || "N/A"}</p>
            <p><b>Message:</b> ${contactMessage || "N/A"}</p>
            <hr>
            <small>Received on: ${new Date().toLocaleString()}</small>
          </div>
        `,
    });

    // --- MAIL B: USER KO CONFIRMATION BHEJNA ---
    await transporter.sendMail({
      from: `"MIBC Team" <${process.env.EMAIL_USER}>`,
      to: contactEmail,
      subject: `México-India Business Council - Acknowledgement of Your Membership Application`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap');
                
                /* Mobile Responsive CSS */
                @media only screen and (max-width: 600px) {
                    .container {
                        width: 100% !important;
                        padding: 20px !important;
                    }
                    .header-title {
                        font-size: 22px !important;
                    }
                    .tagline {
                        font-size: 16px !important;
                    }
                    .body-text {
                        font-size: 17px !important;
                    }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9f9f9;">
            <div class="container" style="font-family: 'Cormorant Garamond', serif; padding: 40px; line-height: 1.6; border: 1px solid #e5e5e5; max-width: 600px; margin: 20px auto; border-radius: 4px; background-color: #ffffff;">

                <div style="border-bottom: 2px solid #D4AF37; padding-bottom: 15px; margin-bottom: 25px; text-align: center;">
                    <h2 class="header-title" style="color: #D4AF37; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">
                        México–India Business Council
                    </h2>
                    <p class="tagline" style="font-style: italic; color: #7f8c8d; margin: 8px 0 0 0; font-size: 18px;">
                        Bridging Two Emerging Giants
                    </p>
                </div>

                <p class="body-text" style="font-size: 19px; margin-top: 0; color: #2c3e50; font-weight: 600;">
                    Dear ${contactName},
                </p>

                <p class="body-text" style="font-size: 18px; color: #34495e;">
                    Thank you for submitting your membership application to the 
                    <strong style="color: #2c3e50;">México–India Business Council</strong>. 
                    We confirm that your application has been received and is currently under review.
                </p>

                <p class="body-text" style="font-size: 18px; color: #34495e;">
                    Our team will respond to you within <strong>24 to 48 hours</strong>. 
                    Should any additional information be required, we will be pleased to connect with you.
                </p>

                <br>

                <div style="border-top: 1px solid #eee; padding-top: 20px;">
                    <p class="body-text" style="font-size: 18px; margin: 0; color: #2c3e50;">
                        Warm regards,<br>
                        <strong style="color: #D4AF37; font-size: 22px;">México-India Business Council</strong>
                    </p>
                </div>

                <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                    Reference ID: ${new Date().getTime()}
                </div>
            </div>
        </body>
        </html>
    `,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully! Check your email.",
    });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({
      success: false,
      error: "Server Error. Please try again later.",
    });
  }
});

/* -------------------- 5. SERVER START -------------------- */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
