const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const emergencyController = require("../controllers/emergencyController");

// Strict rate limiting — emergency access only.
// 3/min per IP because the endpoint is unauthenticated and accepts nationalId
// lookups; without this an attacker could enumerate IDs to build a roster of
// patients. Real paramedic flow only needs 1-2 hits per incident.
const emergencyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "طلبات كثيرة — يرجى الانتظار قليلاً",
  },
});

/* GET /api/emergency/:id — Public (no auth) */
router.get("/:id", emergencyLimiter, emergencyController.getEmergencyData);

module.exports = router;
