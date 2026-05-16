const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["otp", "info", "warning", "success", "error", "pharmacy"],
      default: "info",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Auto-delete after 60 days. The user explicitly complained that
    // notifications pile up — TTL keeps the database tidy without
    // hiding anything someone might still want to see in the short term.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// Mongo TTL index — drops the document automatically when expiresAt passes.
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Composite index: most queries are "this user's notifications, newest first".
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
