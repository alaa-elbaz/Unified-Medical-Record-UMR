const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const auth = require("../middleware/auth");
const { requireRole, requirePatientSelf } = require("../middleware/role");
const validate = require("../middleware/validate");
const { requireObjectId } = require("../utils/safeObjectId");
const upload = require("../middleware/upload");
const recordController = require("../controllers/recordController");
const rateLimit = require("express-rate-limit");

const emergencyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // strictly limit to 3 emergency requests per 15 mins to prevent abuse
  message: { success: false, message: "تم تجاوز الحد الأقصى لطلبات الطوارئ. يرجى المحاولة لاحقاً." },
});

// OTP request limiter: prevents a compromised provider account (or hostile
// staff) from mail-bombing a patient with codes. Keyed per-IP because the
// auth user id is hard to bind here without extra plumbing — combined with
// the in-controller `OtpSession.deleteMany(...)` step this is enough.
// 5 OTP requests per 5 minutes mirrors common 2FA backend defaults.
const otpRequestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "طلبات كثيرة لرمز التحقق — يرجى المحاولة بعد قليل." },
});

// OTP verify limiter: per-session attempt counting already locks at 5 wrong
// codes, but a determined attacker could rotate sessions. Cap verify calls
// per IP to make brute-forcing the 6-digit space infeasible (10⁶ keyspace).
const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "محاولات تحقق كثيرة — يرجى الانتظار قليلاً." },
});

/* POST /api/records — Doctor only */
router.post(
  "/",
  auth,
  requireRole("doctor"),
  [
    body("patientId").isMongoId().withMessage("Valid patientId is required"),
    body("diagnosis").trim().notEmpty().withMessage("Diagnosis is required"),
  ],
  validate,
  recordController.createRecord
);

/* GET /api/records/patient/:patientId — Compatible with frontend (PatientProfile.jsx) */
router.get(
  "/patient/:patientId",
  auth,
  requirePatientSelf,
  requireObjectId("patientId"),
  recordController.getRecordsByPatient
);



/* =========================================================
   PILLAR 3: OTP-Based Secure Medical Record Access
========================================================= */

/* POST /api/records/request-access — Provider requests OTP to access patient records.
   Pharmacy can also request OTP for the controlled-substance dispense flow. */
router.post(
  "/request-access",
  otpRequestLimiter,
  auth,
  requireRole("doctor", "hospital", "lab", "pharmacy"),
  [
    body("patientId").isMongoId().withMessage("Valid patientId is required"),
  ],
  validate,
  recordController.requestAccess
);

/* POST /api/records/verify-otp — Provider submits OTP to unlock records */
router.post(
  "/verify-otp",
  otpVerifyLimiter,
  auth,
  requireRole("doctor", "hospital", "lab", "pharmacy"),
  [
    body("sessionId").isMongoId().withMessage("Valid sessionId is required"),
    // OTP is 6 digits — accept anything 6 chars and let the controller
    // normalize (strip non-digits) so the validator doesn't bounce on
    // accidental whitespace from paste.
    body("code").trim().isLength({ min: 6, max: 8 }).withMessage("OTP must be 6 digits"),
  ],
  validate,
  recordController.verifyOtpAndGetRecords
);

/* =========================================================
   Doctor Direct Access Routes
========================================================= */

/* GET /api/records/doctor/my-patients — Get all patients this doctor has created records for */
router.get(
  "/doctor/my-patients",
  auth,
  requireRole("doctor"),
  recordController.getMyPatientsForDoctor
);

/* GET /api/records/doctor-patient/:patientId — Doctor views records THEY created without OTP */
router.get(
  "/doctor-patient/:patientId",
  auth,
  requireRole("doctor"),
  requireObjectId("patientId"),
  recordController.getRecordsByDoctorAndPatient
);

/* =========================================================
   Legacy / Compatibility Routes
========================================================= */

/* GET /api/records/:patientId — Legacy route (backward compatibility) */
router.get(
  "/:patientId",
  auth,
  requirePatientSelf,
  requireObjectId("patientId"),
  recordController.getRecordsByPatient
);

/* =========================================================
   PILLAR 4: Patient Self-Reporting
========================================================= */

/* POST /api/records/emergency-access/:patientId — Break-the-Glass Override */
router.post(
  "/emergency-access/:patientId",
  auth,
  requireRole("doctor"),
  emergencyLimiter,
  requireObjectId("patientId"),
  [
    body("reason")
      .trim()
      .isLength({ min: 10 })
      .withMessage("يجب تقديم سبب واضح للطوارئ لا يقل عن 10 أحرف"),
  ],
  validate,
  recordController.emergencyOverrideAccess
);

/* =========================================================
   PILLAR 4: Patient Self-Reporting
========================================================= */

/* POST /api/records/self-report — Patient uploads own medical document */
router.post(
  "/self-report",
  auth,
  requireRole("patient"),
  upload.single("file"),
  [
    body("diagnosis").trim().notEmpty().withMessage("وصف / تشخيص السجل مطلوب"),
  ],
  validate,
  recordController.createPatientRecord
);

/* PUT /api/records/:id — Update record (Doctor or Patient Self-Report) */
router.put(
  "/:id",
  auth,
  requireRole("doctor", "patient"),
  requireObjectId("id"),
  [
    body("diagnosis").optional().trim().notEmpty().withMessage("Diagnosis cannot be empty if provided"),
  ],
  validate,
  recordController.updateRecord
);

/* DELETE /api/records/:id — Delete record (Doctor/Admin/Patient Self-Report) */
router.delete(
  "/:id",
  auth,
  requireObjectId("id"),
  recordController.deleteRecord
);

module.exports = router;
