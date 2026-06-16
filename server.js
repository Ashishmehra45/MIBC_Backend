const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const sgMail = require("@sendgrid/mail");
const Contact = require("./model/contact");
const Membership = require("./model/Membership");
const TequilaInterest = require("./model/tauilaRegistration");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { v2: cloudinary } = require("cloudinary"); // <-- Add this
const Questionnaire = require("./model/Questionnaire");

const app = express();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5173", // <--- Bas ye line add hui hai tere frontend ke liye
        "https://mexicoindia.org",
        "https://mibc-fronted.vercel.app",
        "https://www.mexicoindia.org",
      ];
      if (
        !origin ||
        origin === "null" ||
        allowedOrigins.indexOf(origin) !== -1
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* -------------------- MONGODB CONNECTION -------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Connection Error:", err));

/* -------------------- TEST ENDPOINT -------------------- */
// --- 1. CLOUDINARY SETUP ---

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("Cloudinary configured");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // 1. Mimetype check kar rahe hain ki file document hai ya image
    const isDocument = file.mimetype.includes("pdf") || 
                       file.mimetype.includes("msword") || 
                       file.mimetype.includes("officedocument") || 
                       file.mimetype.includes("powerpoint") ||
                       file.mimetype.includes("text");

    // 2. Agar document (PDF, DOC, PPT) hai toh 'raw', warna 'image'
    if (isDocument) {
      return {
        folder: "MIBC_Tequila_Questionnaire",
        resource_type: "raw" // 👈 PDF yahan properly save hoga
      };
    } else {
      return {
        folder: "MIBC_Tequila_Questionnaire",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"] // Sirf images ke liye formats allow kiye
      };
    }
  },
});

const upload = multer({ storage: storage });

const uploadMiddleware = upload.fields([
  { name: "productImage", maxCount: 1 },
  { name: "brandDeck", maxCount: 1 },
  { name: "crtCertificate", maxCount: 1 },
]);

app.post("/api/submit-questionnaire", uploadMiddleware, async (req, res) => {
  try {
    // 1. Text fields data frontend se nikal lo
    const formData = req.body;

    // Checkbox boolean conversion (HTML bhejta hai 'on' agar checked ho)
    const agreedToTerms = formData.agreedToTerms === "on";

    // 2. Cloudinary URLs file inputs se nikal lo
    const files = req.files || {};
    const productImageURL = files["productImage"]
      ? files["productImage"][0].path
      : "";
    const brandDeckURL = files["brandDeck"] ? files["brandDeck"][0].path : "";
    const crtCertificateURL = files["crtCertificate"]
      ? files["crtCertificate"][0].path
      : "";

    // 3. Database me naya document banao
    const newSubmission = new Questionnaire({
      ...formData,
      agreedToTerms: agreedToTerms,
      productImage: productImageURL,
      brandDeck: brandDeckURL,
      crtCertificate: crtCertificateURL,
    });

    // 4. Save kardo
    await newSubmission.save();

    console.log("✅ New Questionnaire Submitted:", newSubmission._id);

    // 5. Success response bhej do
    res.status(201).json({
      success: true,
      message: "Questionnaire submitted successfully!",
    });
  } catch (error) {
    console.error("❌ Submission Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error. Could not submit questionnaire.",
      error: error.message,
    });
  }
});

app.get("/api/get-questionnaires", async (req, res) => {
  try {
    const submissions = await Questionnaire.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    res.status(500).json({ success: false, message: "Server Error. Could not fetch data." });
  }
});

// Delete route bhi add kar lena agar delete button kaam karwana hai
app.delete("/api/get-questionnaires/:id", async (req, res) => {
  try {
    await Questionnaire.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "Server is running!",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- MEMBERSHIP API -------------------- */
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

    if (!contactName || !contactEmail || !contactPhone) {
      return res
        .status(400)
        .json({ success: false, error: "Please fill all required fields." });
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
      message: "Application submitted successfully! Check your email.",
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
      `,
    };

    // User Confirmation Email
    // User Confirmation Email
    // User Confirmation Email - REPLACE THIS BLOCK
    const userEmail = {
      to: contactEmail,
      from: {
        name: "MIBC Team", // Isse 'info' hat jayega
        email: process.env.SENDER_EMAIL,
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
      `,
    };
    Promise.allSettled([sgMail.send(adminEmail), sgMail.send(userEmail)])
      .then(() => console.log("✅ Emails Processed"))
      .catch((err) => console.error("❌ Email Error:", err));
  } catch (error) {
    console.error("❌ Server Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    // 1. Basic Validation
    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ success: false, error: "Required fields are missing." });
    }

    // 2. Database mein Query Save Karna
    // Maan lijiye aapne model ka naam 'Contact' rakha hai
    const newQuery = await Contact.create({
      name,
      phone,
      email,
      subject: subject || "General Inquiry",
      message,
    });

    console.log("✅ Query Saved to DB:", newQuery._id);

    // 3. Response pehle bhej do taaki user ko wait na karna pade
    res.status(200).json({
      success: true,
      message: "Your inquiry has been submitted successfully.",
    });

    // 4. Admin Notification Email
    const adminEmail = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.SENDER_EMAIL,
      subject: `New Inquiry: ${subject || "General Inquiry"} - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">New Contact Submission</h2>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Phone:</b> ${phone || "Not Provided"}</p>
          <p><b>Subject:</b> ${subject || "General Inquiry"}</p>
          <p><b>Message:</b></p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; border-left: 5px solid #D4AF37;">
            ${message}
          </div>
          <p style="font-size: 12px; color: #777; margin-top: 20px;">Submitted on: ${new Date().toLocaleString()}</p>
        </div>
      `,
    };

    const userEmail = {
      to: email,
      from: {
        name: "MIBC Team",
        email: process.env.SENDER_EMAIL,
      },
      subject: "Inquiry Received - México-India Business Council",
      html: `
    <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Georgia', serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;">
        
        <div style="background-color: #ffffff; border-bottom: 3px solid #D4AF37; padding: 30px; text-align: center;">
          <h1 style="color: #D4AF37; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">México–India Business Council</h1>
          <p style="color: #7f8c8d; font-style: italic; margin: 5px 0 0 0;">Bridging Two Emerging Giants</p>
        </div>

        <div style="padding: 40px; color: #2c3e50;">
          <p style="font-size: 18px; font-weight: bold;">Dear ${name},</p>
          
          <p style="font-size: 16px; line-height: 1.6;">Thank you for reaching out to the <b>México-India Business Council</b>.</p>
          
          <p style="font-size: 16px; line-height: 1.6;">We have received your message regarding "<b>${subject || "General Inquiry"}</b>" and our team will get back to you shortly.</p>
          
          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="margin: 0; font-size: 16px;">Regards,</p>
            <p style="margin: 0; color: #D4AF37; font-size: 18px; font-weight: bold;">MIBC Support Team</p>
          </div>
        </div>

      </div>
    </div>
  `,
    };

    // Send Emails in background
    Promise.allSettled([sgMail.send(adminEmail), sgMail.send(userEmail)]).then(
      () => console.log("✅ Contact Emails Dispatched"),
    );
  } catch (error) {
    console.error("❌ Contact Route Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Internal server error." });
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
/* -------------------- ADMIN FETCH QUERIES API -------------------- */
app.get("/api/admin/queries", async (req, res) => {
  try {
    // Contact model se saari queries fetch karein (latest first)
    const queries = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: queries });
  } catch (error) {
    console.error("❌ Queries Fetch Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Queries fetch nahi ho payi" });
  }
});

app.post("/api/tequila-interest", async (req, res) => {
  try {
    // 1. Pehle pura data destructure karo frontend se jo aa raha hai
    const {
      

      fullName,
      position,
      email,
      phone,
      preference,
    
    } = req.body;

    // 2. Basic Validation (Backend side security)
    if ( !fullName || !email || !phone ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the required fields.",
      });
    }

    // 3. Document create karo.
    // IMPORTANT: Make sure ye names tere Mongoose Schema ke sath match karte ho!
    const newEntry = await TequilaInterest.create({
     
      fullName: fullName,
      position: position,
      email: email,
      phone: phone,
      preference: preference,
     
    });

    console.log("✅ Tequila Interest Saved:", newEntry._id);

    // 4. Send Success Response
    res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      data: newEntry,
    });
  } catch (error) {
    console.error("❌ Tequila API Error:", error.message);

    // Custom error message for Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((val) => val.message)
          .join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.get("/api/tequila-interest", async (req, res) => {
  try {
    // TequilaInterest model se saara data fetch karo
    // .sort({ createdAt: -1 }) se latest registrations sabse upar aayengi
    // Note: Iske liye tumhare Mongoose schema me { timestamps: true } hona chahiye
    const registrations = await TequilaInterest.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.delete("/api/tequila-interest/:id", async (req, res) => {
  try {
    const deletedEntry = await TequilaInterest.findByIdAndDelete(req.params.id);

    if (!deletedEntry) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Registration deleted successfully" });
  } catch (error) {
    console.error("❌ Delete Error:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/* -------------------- SERVER START -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
