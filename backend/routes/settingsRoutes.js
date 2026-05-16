/**
 * Public-facing settings endpoint.
 * Returns ONLY the safe, public-readable subset of SystemSettings:
 *  - announcement banner
 *  - registration availability (so frontend can hide/disable register page)
 *  - maintenance flag (so frontend can show maintenance screen)
 *
 * Never exposes internal toggles like autoApprove*.
 */
const express = require("express");
const router = express.Router();
const { getCachedSettings } = require("../middleware/systemSettings");

router.get("/public", async (req, res, next) => {
  try {
    const s = await getCachedSettings();
    res.json({
      success: true,
      data: {
        maintenanceMode: !!s.maintenanceMode,
        maintenanceMessage: s.maintenanceMessage || "",
        registrationEnabled: !!s.registrationEnabled,
        patientRegistrationEnabled: !!s.patientRegistrationEnabled,
        doctorRegistrationEnabled: !!s.doctorRegistrationEnabled,
        organizationRegistrationEnabled: !!s.organizationRegistrationEnabled,
        announcement: s.announcement?.enabled
          ? {
              enabled: true,
              message: s.announcement.message || "",
              level: s.announcement.level || "info",
            }
          : { enabled: false },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
