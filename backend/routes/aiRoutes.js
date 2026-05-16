const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const validate = require("../middleware/validate");
const upload = require("../middleware/upload"); // For handling image uploads
const aiController = require("../controllers/aiController");
const ocrController = require("../controllers/ocrController");

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // max 20 requests per IP
  message: { success: false, message: "تم تجاوز الحد الأقصى لطلبات الذكاء الاصطناعي، يرجى المحاولة لاحقاً." }
});

/* POST /api/ai/analyze — Clinical AI payload builder & analysis */
router.post(
  "/analyze",
  auth,
  requireRole("patient", "doctor", "hospital", "lab", "super_admin", "sub_admin"),
  aiLimiter,
  [
    body("patientId").isMongoId().withMessage("Valid patientId is required"),
  ],
  validate,
  aiController.analyzePatient
);

/* POST /api/ai/format-record — Format patient ramblings (Patient & Providers) */
router.post(
  "/format-record",
  auth,
  aiLimiter,
  [
    body("rawText").trim().notEmpty().withMessage("النص مطلوب"),
  ],
  validate,
  aiController.formatPatientRecord
);

/* POST /api/ai/check-interactions — Check Drug Interactions (Patient & Providers) */
router.post(
  "/check-interactions",
  auth,
  aiLimiter,
  [
    body("newDrug").optional().trim(),
    body("currentDrugs").isArray().withMessage("currentDrugs must be an array"),
  ],
  validate,
  aiController.checkDrugInteractions
);

/* POST /api/ai/chat — Chat with AI Bot (ALL authenticated users) */
router.post(
  "/chat",
  auth,
  aiLimiter,
  [
    body("message").trim().notEmpty().withMessage("الرسالة مطلوبة"),
  ],
  validate,
  aiController.chatWithPatient
);

/* POST /api/ai/ocr — Extract text from uploaded image */
router.post(
  "/ocr",
  auth,
  requireRole("patient", "doctor", "pharmacy"),
  aiLimiter,
  upload.single("image"), // Expect 'image' form data
  ocrController.extractTextFromImage
);

/* POST /api/ai/simplify-diagnosis — Simplify clinical diagnosis for patient */
router.post(
  "/simplify-diagnosis",
  auth,
  requireRole("doctor"),
  aiLimiter,
  [
    body("diagnosis").trim().notEmpty().withMessage("التشخيص مطلوب"),
  ],
  validate,
  aiController.simplifyDiagnosis
);

module.exports = router;
