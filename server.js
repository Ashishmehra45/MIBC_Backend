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
const IntentForm = require("./model/phase_1");
const Phase2 = require("./model/Phase2"); // <-- Add this
const Membership_Query = require("./model/Membership_Query"); // <-- Add this

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
    const isDocument =
      file.mimetype.includes("pdf") ||
      file.mimetype.includes("msword") ||
      file.mimetype.includes("officedocument") ||
      file.mimetype.includes("powerpoint") ||
      file.mimetype.includes("text");

    // 2. Agar document (PDF, DOC, PPT) hai toh 'raw', warna 'image'
    if (isDocument) {
      return {
        folder: "MIBC_Tequila_Questionnaire",
        resource_type: "raw", // 👈 PDF yahan properly save hoga
      };
    } else {
      return {
        folder: "MIBC_Tequila_Questionnaire",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"], // Sirf images ke liye formats allow kiye
      };
    }
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

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
    res
      .status(200)
      .json({ success: true, count: submissions.length, data: submissions });
  } catch (error) {
    console.error("❌ Fetch Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error. Could not fetch data." });
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
    let newQuery;
    try {
      newQuery = await Contact.create({
        name,
        phone,
        email,
        subject: subject || "General Inquiry",
        message,
      });
      console.log("✅ Query Saved to DB:", newQuery._id);
    } catch (dbError) {
      console.error("❌ DB Save Error:", dbError);
      return res.status(500).json({ success: false, error: "Database save failed." });
    }

    const emailSubject = subject || "General Inquiry";

    // 3. Admin Notification Email (Added Plain Text & Standard HTML Wrap)
    const adminEmail = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.SENDER_EMAIL,
      subject: `New Inquiry: ${emailSubject} - ${name}`,
      text: `New Contact Submission\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not Provided"}\nSubject: ${emailSubject}\n\nMessage:\n${message}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="padding: 20px;">
            <h2 style="color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">New Contact Submission</h2>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone || "Not Provided"}</p>
            <p><b>Subject:</b> ${emailSubject}</p>
            <p><b>Message:</b></p>
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; border-left: 5px solid #D4AF37;">
              ${message}
            </div>
            <p style="font-size: 12px; color: #777; margin-top: 20px;">Submitted on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `,
    };

    // 4. User Confirmation Email (Design Exact Same, Spam Signals Fixed)
    const userEmail = {
      to: email,
      from: {
        name: "MIBC Team",
        email: process.env.SENDER_EMAIL,
      },
      subject: "Inquiry Received - México-India Business Council",
      text: `Dear ${name},\n\nThank you for reaching out to the México-India Business Council.\n\nWe have received your message regarding "${emailSubject}" and our team will get back to you shortly.\n\nRegards,\nMIBC Support Team`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color: #f4f4f4; font-family: 'Georgia', serif;">
          <div style="background-color: #f4f4f4; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;">
              
              <div style="background-color: #ffffff; border-bottom: 3px solid #D4AF37; padding: 30px; text-align: center;">
                <h1 style="color: #D4AF37; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">México–India Business Council</h1>
                <p style="color: #7f8c8d; font-style: italic; margin: 5px 0 0 0;">Bridging Two Emerging Giants</p>
              </div>

              <div style="padding: 40px; color: #2c3e50;">
                <p style="font-size: 18px; font-weight: bold;">Dear ${name},</p>
                
                <p style="font-size: 16px; line-height: 1.6;">Thank you for reaching out to the <b>México-India Business Council</b>.</p>
                
                <p style="font-size: 16px; line-height: 1.6;">We have received your message regarding "<b>${emailSubject}</b>" and our team will get back to you shortly.</p>
                
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                  <p style="margin: 0; font-size: 16px;">Regards,</p>
                  <p style="margin: 0; color: #D4AF37; font-size: 18px; font-weight: bold;">MIBC Support Team</p>
                </div>
              </div>

            </div>
          </div>
        </body>
        </html>
      `,
    };

    // 5. Send Emails first, then send HTTP Response
    try {
      await Promise.all([sgMail.send(adminEmail), sgMail.send(userEmail)]);
      console.log("✅ Contact Emails Dispatched Successfully");
    } catch (emailErr) {
      console.error("❌ Email Send Error:", emailErr?.response?.body || emailErr);
    }

    // 6. Return response to Client
    return res.status(200).json({
      success: true,
      message: "Your inquiry has been submitted successfully.",
    });

  } catch (error) {
    console.error("❌ Contact Route Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: "Internal server error." });
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
    res.status(500).json({ success: false, error: "Data not fetched" });
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
    res.status(500).json({ success: false, error: "Queries not fetched" });
  }
});

app.post("/api/tequila-interest", async (req, res) => {
  try {
    // 1. Pehle pura data destructure karo frontend se jo aa raha hai
    const { fullName, position, email, phone, preference } = req.body;

    // 2. Basic Validation (Backend side security)
    if (!fullName || !email || !phone) {
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

// Direct POST API for Registration
app.post("/api/Phase-1-register", async (req, res) => {
  try {
    const newLead = new IntentForm(req.body);
    const savedData = await newLead.save();

    res.status(201).json({
      success: true,
      message: "Form submitted successfully!",
      data: savedData,
    });
  } catch (error) {
    console.error("Error saving form data:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// GET Route to fetch all submitted forms
app.get("/api/Phase-1-leads", async (req, res) => {
  try {
    // Database se saara data nikalenge, latest sabse upar (createdAt: -1)
    const leads = await IntentForm.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// DELETE Route to remove a lead
app.delete("/api/Phase-1-leads/:id", async (req, res) => {
  try {
    const deletedLead = await IntentForm.findByIdAndDelete(req.params.id);
    if (!deletedLead) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
});

// Nayi API - dusre schema se data lane ke liye
app.get("/api/company-details", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required.",
      });
    }

    // Email ke basis pe dusre database/schema mein search karo
    const companyRecord = await Questionnaire.findOne({ email: email });

    if (companyRecord) {
      return res.status(200).json({
        success: true,
        data: {
          companyName: companyRecord.companyName, // Db field name ke hisaab se check kar lena
          contactName: companyRecord.contactName,
        },
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "No record found for this email." });
    }
  } catch (error) {
    console.error("Error fetching company details:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

app.get("/api/full-company-details", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email required." });
    }

    // 1. Questionnaire database mein email se search karo
    const record = await Questionnaire.findOne({ email: email }).lean();

    if (record) {
      // 2. Poora data 'fullRecord' mein bhej do
      return res.status(200).json({
        success: true,
        data: {
          companyName: record.companyName || "Not Available",
          contactName: record.contactName || "Not Available",
          fullRecord: record, // YE POORA DATA FRONTEND KO JAYEGA
        },
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "No company details found." });
    }
  } catch (error) {
    console.error("Error fetching company details:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/api/phase_2", async (req, res) => {
  try {
    // Create a new document with the request body
    const newSubmission = new Phase2(req.body);

    // Save to Database
    const savedSubmission = await newSubmission.save();

    res.status(201).json({
      success: true,
      message: "Phase 2 evidence submitted successfully!",
      data: savedSubmission,
    });
  } catch (error) {
    console.error("Error saving Phase 2 submission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit data. Please check the required fields.",
      error: error.message,
    });
  }
});

// GET Route - Fetch all Phase 2 Submissions for Admin View
app.get("/api/phase_2", async (req, res) => {
  try {
    const submissions = await Phase2.find().sort({ createdAt: -1 }); // Latest first
    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    console.error("Error fetching Phase 2 data:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// DELETE Route - Delete a specific Phase 2 Submission
app.delete("/api/phase_2/:id", async (req, res) => {
  try {
    const deletedSubmission = await Phase2.findByIdAndDelete(req.params.id);
    if (!deletedSubmission) {
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting Phase 2 record:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});



app.post("/api/Membership_Query", async (req, res) => {
  try {
    const { name, phone, email, company, message } = req.body;

    // 1. Validation Check
    if (!name || !phone || !email || !company || !message) {
      return res.status(400).json({
        success: false,
        error: "All fields are required.",
      });
    }

    // 2. Save Data to Database
    let newContact;
    try {
      newContact = await Membership_Query.create({ name, phone, email, company, message });
      console.log("✅ Contact Form Saved to DB:", newContact._id);
    } catch (dbError) {
      console.error("❌ DB Save Error:", dbError);
      return res.status(500).json({
        success: false,
        error: "Failed to save submission. Please try again.",
      });
    }

    // 3. Prepare Email Payloads
    const adminEmail = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.SENDER_EMAIL, // verified sender in SendGrid
      subject: `New Contact Submission - ${company}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
          <h2>New Contact Inquiry</h2>
          <p><b>Name:</b> ${name}</p>
          <p><b>Phone:</b> ${phone}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Company:</b> ${company}</p>
          <p><b>Message:</b></p>
          <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #007bff;">${message}</blockquote>
        </div>
      `,
    };

    const userEmail = {
      to: email,
      from: {
        name: "MIBC Team",
        email: process.env.SENDER_EMAIL,
      },
      subject: "México-India Business Council - We received your message",
      html: `
        <div style="background-color: #f4f4f4; padding: 20px; font-family: 'Georgia', serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #ffffff; border-bottom: 3px solid #D4AF37; padding: 30px; text-align: center;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; text-transform: uppercase;">México–India Business Council</h1>
            </div>
            <div style="padding: 30px; color: #2c3e50;">
              <p style="font-size: 18px; font-weight: bold;">Dear ${name},</p>
              <p style="font-size: 16px; line-height: 1.6;">Thank you for contacting us. We have received your inquiry for <b>${company}</b> and our team will get back to you shortly.</p>
              <div style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
                <p style="margin: 0; color: #D4AF37; font-weight: bold;">MIBC Team</p>
              </div>
            </div>
          </div>
        </div>
      `,
    };

    // 4. Send Emails Concurrently
    try {
      await Promise.all([sgMail.send(adminEmail), sgMail.send(userEmail)]);
      console.log("✅ Emails sent to Admin & User successfully.");
    } catch (emailError) {
      console.error("❌ SendGrid Email Error:");
      if (emailError.response) {
        console.error(JSON.stringify(emailError.response.body, null, 2));
      } else {
        console.error(emailError);
      }
    }

    // 5. Send Success Response
    return res.status(200).json({
      success: true,
      message: "Form submitted successfully!",
    });
  } catch (error) {
    console.error("❌ Contact API Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: "Internal server error." });
    }
  }
});

/* -------------------- SERVER START -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
