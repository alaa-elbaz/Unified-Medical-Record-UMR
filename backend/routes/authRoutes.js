const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");

/* =========================================================
   Rate limiters
========================================================= */

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // دقيقة واحدة بدلا من 15 دقيقة
  max: 10, // 10 محاولات
  message: {
    success: false,
    message: "عدد محاولات تسجيل الدخول كبير جدًا، يرجى المحاولة مرة أخرى بعد دقيقة واحدة",
  },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many registration attempts, please try again later",
  },
});

/* =========================================================
   POST /api/auth/register/patient
========================================================= */

router.post(
  "/register/patient",
  registerLimiter,
  upload.fields([{ name: "idDocument", maxCount: 1 }]),
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Invalid email address"),
    body("nationalId").trim().notEmpty().withMessage("National ID is required"),
    body("phoneNumber")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),
    body("gender")
      .isIn(["male", "female"])
      .withMessage("Gender must be male or female"),
    body("mothersName")
      .trim()
      .notEmpty()
      .withMessage("Mother's name is required"),
  ],
  validate,
  authController.registerPatient
);

/* =========================================================
   POST /api/auth/register/doctor
========================================================= */

router.post(
  "/register/doctor",
  registerLimiter,
  upload.fields([{ name: "syndicateId", maxCount: 1 }]),
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Invalid email address"),
    body("nationalId").trim().notEmpty().withMessage("National ID is required"),
    body("phoneNumber")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),
    body("gender")
      .isIn(["male", "female"])
      .withMessage("Gender must be male or female"),
    body("syndicateNumber")
      .trim()
      .notEmpty()
      .withMessage("Syndicate number is required"),
  ],
  validate,
  authController.registerDoctor
);

/* =========================================================
   POST /api/auth/register/hospital
========================================================= */

router.post(
  "/register/hospital",
  registerLimiter,
  [
    body("name").trim().notEmpty().withMessage("Hospital name is required"),
    body("email").isEmail().withMessage("Invalid email address"),
    body("healthRegNumber").trim().notEmpty().withMessage("Health registration number is required"),
    body("phoneNumber").trim().notEmpty().withMessage("Phone number is required"),
    body("sectorType").isIn(["Private", "Public"]).withMessage("Sector type must be Private or Public"),
  ],
  validate,
  authController.registerHospital
);

/* =========================================================
   POST /api/auth/register/lab
========================================================= */

router.post(
  "/register/lab",
  registerLimiter,
  [
    body("name").trim().notEmpty().withMessage("Lab name is required"),
    body("email").isEmail().withMessage("Invalid email address"),
    body("healthRegNumber").trim().notEmpty().withMessage("Health registration number is required"),
    body("phoneNumber").trim().notEmpty().withMessage("Phone number is required"),
    body("sectorType").isIn(["Private", "Public"]).withMessage("Sector type must be Private or Public"),
  ],
  validate,
  authController.registerLab
);

/* =========================================================
   POST /api/auth/register/pharmacy
========================================================= */

router.post(
  "/register/pharmacy",
  registerLimiter,
  [
    body("name").trim().notEmpty().withMessage("Pharmacy name is required"),
    body("email").isEmail().withMessage("Invalid email address"),
    body("healthRegNumber").trim().notEmpty().withMessage("Health registration number is required"),
    body("phoneNumber").trim().notEmpty().withMessage("Phone number is required"),
    body("sectorType").isIn(["Private", "Public"]).withMessage("Sector type must be Private or Public"),
  ],
  validate,
  authController.registerPharmacy
);


/* =========================================================
   POST /api/auth/login — يدعم الأفراد والمنظمات
========================================================= */

router.post(
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("Invalid email address"),
    // nationalId مطلوب فقط لتسجيل دخول الأفراد
    body("nationalId").optional(),
    body("healthRegNumber").optional(),
    body("loginType").optional().isIn(["individual", "organization"]),
  ],
  validate,
  authController.login
);

/* =========================================================
   GET /api/auth/me  (was incorrectly "/auth/me" before)
========================================================= */

router.get("/me", auth, authController.getMe);

/* =========================================================
   POST /api/auth/recover-email
========================================================= */

const recoverLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many recovery attempts, please try again later",
  },
});

router.post(
  "/recover-email",
  recoverLimiter,
  [
    body("nationalId").notEmpty().withMessage("National ID is required"),
    body("role").isIn(["patient", "doctor"]).withMessage("Valid role is required"),
    body("securityAnswer").notEmpty().withMessage("Security answer is required"),
  ],
  validate,
  authController.recoverEmail
);

/* =========================================================
   PUT /api/auth/profile
========================================================= */

router.put("/profile", auth, authController.updateProfile);

module.exports = router;
