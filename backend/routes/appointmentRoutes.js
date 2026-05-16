const express = require("express");
const router = express.Router();
const { body, oneOf } = require("express-validator");

const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const validate = require("../middleware/validate");
const { requireObjectId } = require("../utils/safeObjectId");
const rateLimit = require("express-rate-limit");
const appointmentController = require("../controllers/appointmentController");
const { validateCreateAppointment } = require("../middleware/appointmentValidator");

/* GET /api/appointments — Role-based list */
router.get("/", auth, appointmentController.getAppointments);

const createAppointmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20, // 20 limits as requested
  message: { success: false, message: "Too many requests. Please try again later." }
});

/* POST /api/appointments — Patient books */
router.post(
  "/",
  auth,
  requireRole("patient"),
  createAppointmentLimiter,
  validateCreateAppointment,
  validate,
  appointmentController.createAppointment
);

/* PATCH /api/appointments/:id/status — Update status */
router.patch(
  "/:id/status",
  auth,
  requireObjectId("id"),
  [
    body("status")
      .notEmpty()
      .isIn(['Pending', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'Follow-up'])
      .withMessage("حالة غير صحيحة"),
  ],
  validate,
  appointmentController.updateAppointmentStatus
);

/* PUT /api/appointments/:id — Update appointment details */
router.put(
  "/:id",
  auth,
  requireRole("patient", "hospital", "lab"),
  requireObjectId("id"),
  validateCreateAppointment, // Can re-use create validation for updates since it only updates what is passed
  validate,
  appointmentController.updateAppointment
);

module.exports = router;
