const express = require("express");
const router  = express.Router();
const { body } = require("express-validator");

const labController = require("../controllers/labController");
const auth          = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const upload        = require("../middleware/upload");
const validate      = require("../middleware/validate");
const { requireObjectId } = require("../utils/safeObjectId");

/* ─────────────────────────────────────────────────────────
   POST /api/labs — Create a lab request or patient upload
───────────────────────────────────────────────────────── */
router.post(
  "/",
  auth,
  requireRole("patient", "doctor", "admin", "lab", "hospital"),
  upload.array("labFiles", 10),
  [
    body("testName").trim().notEmpty().withMessage("اسم الفحص مطلوب"),
  ],
  validate,
  labController.createLabResult
);

/* ─────────────────────────────────────────────────────────
   GET /api/labs — List lab results (role-filtered)
───────────────────────────────────────────────────────── */
router.get("/", auth, labController.getLabResults);

/* ─────────────────────────────────────────────────────────
   PUT /api/labs/:id/status — Update status + optional PDF upload
   Body: { status: 'pending_result' | 'completed', result? }
   File: labFile (multipart)
───────────────────────────────────────────────────────── */
router.put(
  "/:id/status",
  auth,
  requireRole("doctor", "admin", "lab", "hospital"),
  requireObjectId("id"),
  upload.array("labFiles", 10),
  [
    body("status")
      .isIn(["pending_sample", "pending_result", "completed"])
      .withMessage("حالة غير صحيحة"),
  ],
  validate,
  labController.updateLabStatus
);

/* ─────────────────────────────────────────────────────────
   PUT /api/labs/:id — Update lab result details (name, date, image)
───────────────────────────────────────────────────────── */
router.put(
  "/:id",
  auth,
  requireRole("patient", "doctor", "admin", "lab", "hospital"),
  requireObjectId("id"),
  upload.array("labFiles", 10),
  [
    body("testName").trim().notEmpty().withMessage("اسم التحليل مطلوب")
  ],
  validate,
  labController.updateLabResult
);

/* ─────────────────────────────────────────────────────────
   DELETE /api/labs/:id
───────────────────────────────────────────────────────── */
router.delete(
  "/:id",
  auth,
  requireRole("patient", "doctor", "admin"),
  requireObjectId("id"),
  labController.deleteLabResult
);

module.exports = router;