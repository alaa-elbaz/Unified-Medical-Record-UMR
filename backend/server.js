require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const recordRoutes = require("./routes/recordRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const labRoutes = require("./routes/labRoutes");
const radiologyRoutes = require("./routes/radiologyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const imageRoutes = require("./routes/imageRoutes");
const aiRoutes = require("./routes/aiRoutes");
const errorHandler = require("./middleware/errorHandler");
const { blockOnMaintenance } = require("./middleware/systemSettings");

/* =========================================================
   Environment validation
========================================================= */

const REQUIRED_ENV = ["JWT_SECRET", "MONGO_URI"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
const isProduction = process.env.NODE_ENV === "production";

/* =========================================================
   CORS & Helmet — Security Headers
========================================================= */

app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://umr-project.vercel.app',
  'https://umr-project.vercel.app/',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    // LAN / localhost regex is only safe in development. In production an
    // attacker on the same WAN as a logged-in user could host a malicious
    // page on http://192.168.x.x and have it accepted with credentials.
    if (!isProduction && /^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|localhost|127\.0\.0\.1)/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS Policy: Unauthorized Access'));
  },
  credentials: true,
}));

/* =========================================================
   Body parsing
========================================================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Strip MongoDB operator characters ($, .) from req.body / req.query / req.params
// so an attacker can't smuggle `{"email": {"$gt": ""}}` into a query and bypass
// equality matching. Applied here once instead of per-route.
const mongoSanitize = require("mongo-sanitize");
app.use((req, _res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  if (req.query) {
    // req.query in Express 4 is read-only on some setups; mutate keys in place.
    for (const k of Object.keys(req.query)) {
      req.query[k] = mongoSanitize(req.query[k]);
    }
  }
  if (req.params) {
    for (const k of Object.keys(req.params)) {
      req.params[k] = mongoSanitize(req.params[k]);
    }
  }
  next();
});

/* =========================================================
   Global rate limiter (300 req / 15 min per IP)
========================================================= */

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});

app.use("/api", globalLimiter);

// Maintenance gate — when an admin toggles maintenanceMode on, this returns
// 503 for everyone except admins and a small whitelist (login/me/health).
app.use(blockOnMaintenance);

/* =========================================================
   Static uploads (authenticated)
========================================================= */

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const authenticateUploads = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized access to uploads" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "umr-api",
      audience: "umr-client",
    });
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

app.use(
  "/uploads",
  authenticateUploads,
  express.static(uploadDir, { index: false, redirect: false })
);

/* =========================================================
   Health check
========================================================= */

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    success: dbState === 1,
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: dbStatus[dbState] || "unknown",
  });
});

/* =========================================================
   Database connection
========================================================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Connected to MongoDB Atlas");

    // --- MIGRATION: Fix 'pharmacist' to 'pharmacy' in Database ---
    try {
      const Organization = require('./models/Organization');
      const result = await Organization.updateMany(
        { type: 'pharmacist' },
        { $set: { type: 'pharmacy' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Migrated ${result.modifiedCount} pharmacist organizations to pharmacy role.`);
      }
    } catch (e) {
      console.error('❌ Migration error:', e);
    }
    // -------------------------------------------------------------

    // Initialize cron jobs ONLY after DB is up — they query Mongo every tick
    // and would throw on first run if scheduled before connect() resolved.
    try {
      require("./jobs/notificationCron")();
    } catch (e) {
      console.error('❌ Failed to initialize cron jobs:', e);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* =========================================================
   API routes
========================================================= */

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/labs", labRoutes);
app.use("/api/radiology", radiologyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/hospital", require("./routes/hospitalRoutes"));
app.use("/api/images", imageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/emergency", require("./routes/emergencyRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));

/* =========================================================
   404 catch-all for unknown API routes
========================================================= */

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================================================
   Global error handler (must be LAST middleware)
========================================================= */

app.use(errorHandler);

/* =========================================================
   Start server
========================================================= */

const PORT = process.env.PORT || 3000;

// Cron jobs are initialized inside the Mongo `.then()` callback above so they
// never run before the DB connection is ready.

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);

  // Self-ping every 14 minutes to prevent Render free-tier cold starts
  if (isProduction) {
    const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL
      ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
      : `http://localhost:${PORT}/api/health`;

    setInterval(async () => {
      try {
        const https = require("https");
        const http = require("http");
        const mod = KEEP_ALIVE_URL.startsWith("https") ? https : http;
        mod.get(KEEP_ALIVE_URL, (res) => {
          console.log(`[keep-alive] pinged ${res.statusCode}`);
        });
      } catch {
        // silent — best-effort keep-alive
      }
    }, 14 * 60 * 1000);
  }
});
