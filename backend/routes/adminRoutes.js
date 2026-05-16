const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { requireRole, authorizeSuperAdmin } = require("../middleware/role");
const { requireObjectId } = require("../utils/safeObjectId");
const adminController = require("../controllers/adminController");

// Helpers for cleaner code
const adminAuth = [auth, requireRole("super_admin", "sub_admin")];
const superAdminAuth = [auth, authorizeSuperAdmin];

// =========================================================
// Stats
// =========================================================
router.get("/stats", ...adminAuth, adminController.getStats);

// =========================================================
// Users
// =========================================================
router.get("/users", ...adminAuth, adminController.getUsers);
router.post("/users", ...adminAuth, adminController.createUser);
router.get("/users/pending", ...adminAuth, adminController.getPendingUsers);
router.get("/user/:id", ...adminAuth, requireObjectId("id"), adminController.getUserById);
router.put("/user/:id", ...adminAuth, requireObjectId("id"), adminController.updateUser);
router.put("/users/:id/status", ...adminAuth, requireObjectId("id"), adminController.updateUserStatus);
router.delete("/user/:id", ...superAdminAuth, requireObjectId("id"), adminController.deleteUser);

// =========================================================
// Doctors (Specific queries)
// =========================================================
router.get("/doctors", ...adminAuth, adminController.getDoctors);
router.put("/verify-doctor/:id", ...adminAuth, requireObjectId("id"), adminController.verifyDoctor);

// =========================================================
// Organizations
// =========================================================
router.get("/organizations", ...adminAuth, adminController.getOrganizations);
router.post("/organizations", ...adminAuth, adminController.createOrganization);
router.get("/organization/:id", ...adminAuth, requireObjectId("id"), adminController.getOrganizationById);
router.put("/organization/:id", ...adminAuth, requireObjectId("id"), adminController.updateOrganization);
router.put("/organizations/:id/status", ...adminAuth, requireObjectId("id"), adminController.updateOrganizationStatus);
router.delete("/organization/:id", ...superAdminAuth, requireObjectId("id"), adminController.deleteOrganization);

// =========================================================
// Pending Approvals (For Hospitals/Labs)
// =========================================================
router.get("/pending-organizations", ...adminAuth, adminController.getPendingOrganizations);
router.put("/approve-organization/:id", ...adminAuth, requireObjectId("id"), adminController.approveOrganization);

// =========================================================
// Bulk Actions
// =========================================================
router.post("/users/bulk-status", ...adminAuth, adminController.bulkUpdateUsersStatus);
router.post("/users/bulk-delete", ...superAdminAuth, adminController.bulkDeleteUsers);
router.post("/organizations/bulk-status", ...adminAuth, adminController.bulkUpdateOrganizationsStatus);

// =========================================================
// Export (CSV)
// =========================================================
router.get("/export/users", ...adminAuth, adminController.exportUsersCsv);
router.get("/export/organizations", ...adminAuth, adminController.exportOrganizationsCsv);


// =========================================================
// Activity Log
// =========================================================
router.get("/activity-log", ...adminAuth, adminController.getActivityLog);
router.delete("/activity-log", ...superAdminAuth, adminController.clearActivityLog);

// =========================================================
// System Settings (super_admin only for writes)
// =========================================================
router.get("/settings", ...adminAuth, adminController.getSystemSettings);
router.put("/settings", ...superAdminAuth, adminController.updateSystemSettings);

// =========================================================
// Sub-Admin Management (super_admin only)
// =========================================================
router.get("/sub-admins", ...superAdminAuth, adminController.getSubAdmins);
router.post("/sub-admins", ...superAdminAuth, adminController.createSubAdmin);
router.delete("/sub-admins/:id", ...superAdminAuth, requireObjectId("id"), adminController.removeSubAdmin);

module.exports = router;
