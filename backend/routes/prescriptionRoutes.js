const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const auth = require("../middleware/auth");
const { requireRole, requirePatientSelf } = require("../middleware/role");
const validate = require("../middleware/validate");
const { requireObjectId } = require("../utils/safeObjectId");
const prescriptionController = require("../controllers/prescriptionController");

/* POST /api/prescriptions — Create prescription or self-report */
router.post(
  "/",
  auth,
  requireRole("doctor", "patient", "pharmacy"),
  [
    body("medication").trim().notEmpty().withMessage("Medication is required"),
    body("dose").trim().notEmpty().withMessage("Dose is required"),
    body("duration").trim().notEmpty().withMessage("Duration is required"),
  ],
  validate,
  prescriptionController.createPrescription
);

/* POST /api/prescriptions/bulk — Create multiple prescriptions at once */
router.post(
  "/bulk",
  auth,
  requireRole("doctor"),
  [
    body("medications").isArray({ min: 1 }).withMessage("Medications array is required"),
    body("medications.*.medication").trim().notEmpty().withMessage("Medication is required"),
    body("medications.*.dose").trim().notEmpty().withMessage("Dose is required"),
    body("medications.*.duration").trim().notEmpty().withMessage("Duration is required")
  ],
  validate,
  prescriptionController.createBulkPrescriptions
);

/* GET /api/prescriptions — Doctor or Admin */
router.get(
  "/",
  auth,
  requireRole("doctor", "admin"),
  prescriptionController.getAllPrescriptions
);

/* GET /api/prescriptions/pharmacy/stats — Pharmacy */
router.get(
  "/pharmacy/stats",
  auth,
  requireRole("pharmacy"),
  prescriptionController.getPharmacyStats
);

/* GET /api/prescriptions/pharmacy/history — Pharmacy */
router.get(
  "/pharmacy/history",
  auth,
  requireRole("pharmacy"),
  prescriptionController.getPharmacyHistory
);

/* GET /api/prescriptions/pharmacy/requests — Pharmacy */
router.get(
  "/pharmacy/requests",
  auth,
  requireRole("pharmacy"),
  prescriptionController.getPharmacyRequests
);

/* GET /api/prescriptions/pharmacies/active — Public/Patient */
router.get(
  "/pharmacies/active",
  auth,
  prescriptionController.getActivePharmacies
);

/* GET /api/prescriptions/:patientId — Doctor or patient themselves */
router.get(
  "/:patientId",
  auth,
  requirePatientSelf,
  requireObjectId("patientId"),
  prescriptionController.getPrescriptionsByPatient
);

/* PUT /api/prescriptions/:id/request-pharmacy — Patient requests pharmacy */
router.put(
  "/:id/request-pharmacy",
  auth,
  requireRole("patient"),
  requireObjectId("id"),
  prescriptionController.requestPharmacy
);

/* PUT /api/prescriptions/:id/dispense — Admin/Pharmacist */
router.put(
  "/:id/dispense",
  auth,
  requireRole("admin", "pharmacy"),
  requireObjectId("id"),
  prescriptionController.dispensePrescription
);

/* DELETE /api/prescriptions/:id — Delete prescription (Doctor/Admin/Patient Self-Report) */
router.delete(
  "/:id",
  auth,
  // Defense-in-depth: previously this route had no role gate at all and relied
  // entirely on the controller's ownership check. Pharmacy/lab/hospital JWTs
  // had no business hitting it. Controller still enforces ownership.
  requireRole("doctor", "patient", "admin"),
  requireObjectId("id"),
  prescriptionController.deletePrescription
);

/* PUT /api/prescriptions/:id — Update prescription */
router.put(
  "/:id",
  auth,
  requireRole("doctor", "patient", "pharmacy"),
  requireObjectId("id"),
  [
    body("medication").optional().trim().notEmpty().withMessage("Medication cannot be empty if provided"),
    body("dose").optional().trim().notEmpty().withMessage("Dose cannot be empty if provided"),
    body("duration").optional().trim().notEmpty().withMessage("Duration cannot be empty if provided"),
  ],
  validate,
  prescriptionController.updatePrescription
);

module.exports = router;
