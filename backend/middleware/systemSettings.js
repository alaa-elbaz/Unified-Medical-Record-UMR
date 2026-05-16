/**
 * Middleware enforcing live SystemSettings rules.
 *
 * Exposes:
 *  - getCachedSettings()                  : in-memory cached settings (60s TTL)
 *  - invalidateSettingsCache()            : called when settings update
 *  - blockOnMaintenance(req, res, next)   : 503 unless caller is admin or hitting whitelisted route
 *  - enforceRegistration(role)            : returns express middleware that returns 403 if registration disabled
 *
 * The cache avoids hitting Mongo on every request; invalidate on PUT /admin/settings.
 */

const SystemSettings = require("../models/SystemSettings");

let cache = null;
let cacheExpires = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function getCachedSettings() {
  const now = Date.now();
  if (cache && now < cacheExpires) return cache;
  try {
    const doc = await SystemSettings.getSettings();
    cache = doc.toObject ? doc.toObject() : doc;
    cacheExpires = now + CACHE_TTL_MS;
    return cache;
  } catch (err) {
    // If DB is unavailable, fall back to permissive defaults so we don't lock ourselves out
    return {
      registrationEnabled: true,
      patientRegistrationEnabled: true,
      doctorRegistrationEnabled: true,
      organizationRegistrationEnabled: true,
      maintenanceMode: false,
      autoApprovePatients: false,
      autoApproveDoctors: false,
      autoApproveOrganizations: false,
      announcement: { enabled: false },
    };
  }
}

function invalidateSettingsCache() {
  cache = null;
  cacheExpires = 0;
}

/**
 * Routes that must remain reachable even during maintenance:
 *  - login, /me, settings (admins log in here), public settings.
 */
const MAINTENANCE_WHITELIST = [
  /^\/api\/auth\/login\/?$/,
  /^\/api\/auth\/me\/?$/,
  /^\/api\/auth\/logout\/?$/,
  /^\/api\/admin\/.*$/, // admin panel must keep working during maintenance
  /^\/api\/settings\/public\/?$/, // unauth, used by frontend to know mode
  /^\/api\/health\/?$/,
];

function isWhitelisted(path) {
  return MAINTENANCE_WHITELIST.some((rx) => rx.test(path));
}

async function blockOnMaintenance(req, res, next) {
  try {
    // Only enforce for /api routes; static/SPA continues serving
    if (!req.path.startsWith("/api/")) return next();
    if (isWhitelisted(req.path)) return next();

    const settings = await getCachedSettings();
    if (!settings.maintenanceMode) return next();

    // If we have an authenticated admin user, allow through
    const role = req.user?.role;
    if (role === "super_admin" || role === "sub_admin") return next();

    return res.status(503).json({
      success: false,
      maintenance: true,
      message: settings.maintenanceMessage || "النظام تحت الصيانة، نعتذر عن الإزعاج. سنعود قريباً.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * enforceRegistration('patient' | 'doctor' | 'organization')
 * Returns a middleware that 403s if the matching toggle is off.
 */
function enforceRegistration(target) {
  return async function (req, res, next) {
    try {
      const settings = await getCachedSettings();
      if (!settings.registrationEnabled) {
        return res.status(403).json({
          success: false,
          message: "التسجيل في المنصة موقوف مؤقتاً. يرجى المحاولة لاحقاً.",
        });
      }
      const map = {
        patient: settings.patientRegistrationEnabled,
        doctor: settings.doctorRegistrationEnabled,
        organization: settings.organizationRegistrationEnabled,
      };
      if (target && map[target] === false) {
        const labels = { patient: "المرضى", doctor: "الأطباء", organization: "المنظمات" };
        return res.status(403).json({
          success: false,
          message: `تسجيل ${labels[target]} موقوف مؤقتاً. يرجى المحاولة لاحقاً.`,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  getCachedSettings,
  invalidateSettingsCache,
  blockOnMaintenance,
  enforceRegistration,
};
