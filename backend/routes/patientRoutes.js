const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const auth = require("../middleware/auth");
const { requireRole, requirePatientSelf } = require("../middleware/role");
const validate = require("../middleware/validate");
const { requireObjectId } = require("../utils/safeObjectId");
const patientController = require("../controllers/patientController");

/* POST /api/patients — Doctor or Admin adds a new patient */
router.post(
  "/",
  auth,
  requireRole("doctor", "admin"),
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("nationalId").trim().notEmpty().withMessage("National ID is required"),
    body("phoneNumber")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required"),
    body("gender")
      .isIn(["male", "female"])
      .withMessage("Gender must be male or female"),
  ],
  validate,
  patientController.createPatient
);

/* GET /api/patients — Doctors, Admins, Hospitals & Labs, with ?search= and ?page=&limit= */
router.get(
  "/",
  auth,
  requireRole("doctor", "admin", "hospital", "lab", "pharmacy"),
  patientController.getPatients
);

/* GET /api/patients/my-patients — Doctor gets only their patients */
router.get(
  "/my-patients",
  auth,
  requireRole("doctor", "hospital"),
  patientController.getMyPatients
);

/* GET /api/patients/:id — Doctor or the patient themselves */
router.get(
  "/:id",
  auth,
  requirePatientSelf,
  requireObjectId("id"),
  patientController.getPatientById
);

/* PUT /api/patients/:id — Patient themselves or Admin */
router.put(
  "/:id",
  auth,
  requirePatientSelf,
  requireObjectId("id"),
  patientController.updatePatient
);

/* DELETE /api/patients/:id — Admin only */
router.delete(
  "/:id",
  auth,
  requireRole("admin"),
  requireObjectId("id"),
  patientController.deletePatient
);

/* GET /api/patients/:id/qr-token — Generate QR */
router.get(
  "/:id/qr-token",
  auth,
  requirePatientSelf,
  requireObjectId("id"),
  patientController.generateQrToken
);

/* POST /api/patients/verify-qr — Verify QR
   PUBLIC by design: the signed `qr_access` JWT carried in the request body IS
   the authentication. Paramedics scan the QR from an unauthenticated kiosk /
   their phone with no logged-in session, so requiring `auth` here used to 401
   every legitimate scan. The controller still rejects any token whose
   `type !== 'qr_access'` or whose signature/exp is invalid. */
router.post(
  "/verify-qr",
  patientController.verifyQrToken
);

/* GET /api/patients/:id/pdf — Export Patient Record as PDF */
router.get(
  "/:id/pdf",
  auth,
  requireRole("admin", "doctor", "patient"),
  requireObjectId("id"),
  patientController.exportPatientPDF
);

module.exports = router;
