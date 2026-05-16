const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const hospitalController = require("../controllers/hospitalController");

/* GET /api/hospital/stats — Get dashboard stats */
router.get(
  "/stats",
  auth,
  requireRole("hospital"),
  hospitalController.getHospitalStats
);

/* POST /api/hospital/departments — Add Department */
router.post(
  "/departments",
  auth,
  requireRole("hospital"),
  hospitalController.addDepartment
);

/* GET /api/hospital/departments — List Departments */
router.get(
  "/departments",
  auth,
  requireRole("hospital"),
  hospitalController.getDepartments
);

/* POST /api/hospital/doctors/add — Add Scoped Doctor */
router.post(
  "/doctors/add",
  auth,
  requireRole("hospital"),
  hospitalController.addScopedDoctor
);

/* GET /api/hospital/doctors — List Doctors */
router.get(
  "/doctors",
  auth,
  requireRole("hospital"),
  hospitalController.getDoctors
);

module.exports = router;
