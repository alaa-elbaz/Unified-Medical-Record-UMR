const mongoose = require("mongoose");

/**
 * SystemSettings — singleton document holding global platform settings.
 * Use SystemSettings.getSettings() to retrieve (creates default doc if missing).
 */
const systemSettingsSchema = new mongoose.Schema(
  {
    // Singleton key — always 'global'
    key: { type: String, default: "global", unique: true, immutable: true },

    // Public registration toggles
    registrationEnabled: { type: Boolean, default: true },
    patientRegistrationEnabled: { type: Boolean, default: true },
    doctorRegistrationEnabled: { type: Boolean, default: true },
    organizationRegistrationEnabled: { type: Boolean, default: true },

    // Maintenance mode — when true, only admins can access the system
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: "النظام تحت الصيانة، نعتذر عن الإزعاج. سنعود قريباً.",
    },

    // Auto-approval toggles (skip admin review)
    autoApprovePatients: { type: Boolean, default: false },
    autoApproveDoctors: { type: Boolean, default: false },
    autoApproveOrganizations: { type: Boolean, default: false },

    // Platform announcement banner
    announcement: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "" },
      level: { type: String, enum: ["info", "warning", "success"], default: "info" },
    },

    // Audit
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

systemSettingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne({ key: "global" });
  if (!doc) doc = await this.create({ key: "global" });
  return doc;
};

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
