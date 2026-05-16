/**
 * requireRole(...roles)
 * Middleware that checks if the logged-in user has one of the allowed roles.
 * Must be used AFTER the auth middleware (so req.user is available).
 * 
 * Auto-expansion: If "admin" is specified, it will also match 
 * "super_admin" and "sub_admin" since User schema uses those names.
 */
function requireRole(...roles) {
  // Expand "admin" to include all admin sub-types
  const expandedRoles = new Set(roles);
  if (expandedRoles.has("admin")) {
    expandedRoles.add("super_admin");
    expandedRoles.add("sub_admin");
  }

  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    if (!expandedRoles.has(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
}

/**
 * requirePatientSelf
 * Middleware that allows a patient to access ONLY their own data.
 * Doctors and admins can access any patient's data.
 * Checks req.params.id or req.params.patientId against req.user.userId.
 */
function requirePatientSelf(req, res, next) {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized" });
  }

  // Privileged admins can access any patient's data.
  if (["super_admin", "sub_admin"].includes(req.user.role)) {
    return next();
  }

  // Patients can only access their own data — fail closed if the route
  // doesn't expose the target id (previously this fell through silently).
  const targetId = req.params.id || req.params.patientId || req.body?.patientId;
  if (!targetId) {
    return res.status(400).json({
      success: false,
      message: "Missing patient identifier",
    });
  }

  if (req.user.role === "patient") {
    if (req.user.userId.toString() !== targetId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you can only access your own data",
      });
    }
    return next();
  }

  // For other roles (doctor / hospital / lab / pharmacy) the route handlers
  // are responsible for enforcing scoped ownership themselves (e.g. through
  // OTP sessions or doctorId filters). We let the request pass through here
  // but no longer pretend to authorize it.
  next();
}

/**
 * authorizeSuperAdmin
 * Middleware to restrict access only to Super Admins (for delete operations, etc.)
 */
function authorizeSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Super Admin access required",
    });
  }
  next();
}

module.exports = { requireRole, requirePatientSelf, authorizeSuperAdmin };
