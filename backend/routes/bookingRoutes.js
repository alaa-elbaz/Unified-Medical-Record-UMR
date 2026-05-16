const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const bookingController = require("../controllers/bookingController");

/* GET /api/booking/providers — Get active doctors and hospitals */
router.get("/providers", auth, bookingController.getProviders);

/* GET /api/booking/available-slots — Get available time slots */
router.get("/available-slots", auth, bookingController.getAvailableSlots);

/* GET /api/booking/hospital/:id/departments-doctors — Get doctors grouped by department for a hospital */
router.get("/hospital/:id/departments-doctors", auth, bookingController.getHospitalDepartmentsAndDoctors);

module.exports = router;
