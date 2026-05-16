const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const radiologyController = require("../controllers/radiologyController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { requireObjectId } = require("../utils/safeObjectId");

/* POST /api/radiology — Create radiology result or patient upload */
router.post(
  "/",
  auth,
  requireRole("patient", "doctor", "admin"),
  upload.single("radiologyFile"),
  [
    body("scanType").trim().notEmpty().withMessage("نوع الأشعة مطلوب"),
  ],
  validate,
  radiologyController.createRadiology
);

/* GET /api/radiology — List radiology results */
router.get("/", auth, radiologyController.getRadiologyResults);

/* PUT /api/radiology/:id — Update radiology scan type, date, image */
router.put(
  "/:id",
  auth,
  requireRole("patient", "doctor", "admin"),
  requireObjectId("id"),
  upload.single("radiologyFile"),
  [
    body("scanType").trim().notEmpty().withMessage("نوع الأشعة مطلوب")
  ],
  validate,
  radiologyController.updateRadiology
);

/* DELETE /api/radiology/:id — Delete radiology result */
router.delete(
  "/:id",
  auth,
  requireRole("patient", "doctor", "admin"),
  requireObjectId("id"),
  radiologyController.deleteRadiology
);

module.exports = router;