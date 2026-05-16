/**
 * Unified notification helper.
 *
 * notifyUser({ userId, title, message, type, category, link })
 *  - Always creates a Notification document in MongoDB.
 *  - If the user has emailEnabled (master) AND the relevant per-category
 *    toggle is on, also sends a templated HTML email.
 *  - Email is fire-and-forget: failures log but never reject.
 *
 * Categories control which user preference is checked:
 *   - 'appointments'   → emailAppointments
 *   - 'prescriptions'  → emailPrescriptions
 *   - 'lab'            → emailLabResults
 *   - 'account'        → emailAccount    (default)
 *   - 'announcement'   → emailAnnouncements
 */

const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("./emailService");

const CATEGORY_TO_PREF = {
  appointments: "emailAppointments",
  prescriptions: "emailPrescriptions",
  lab: "emailLabResults",
  account: "emailAccount",
  announcement: "emailAnnouncements",
};

const TYPE_TO_HEADER_COLOR = {
  info: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  otp: "#6366f1",
};

function buildEmailHtml({ title, message, type = "info", link }) {
  const accent = TYPE_TO_HEADER_COLOR[type] || TYPE_TO_HEADER_COLOR.info;
  const safeLink = link && /^https?:\/\//i.test(link) ? link : null;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Tajawal,Segoe UI,Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,${accent},#0369a1);padding:24px 28px;color:#fff;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.18);display:inline-flex;align-items:center;justify-content:center;font-weight:900;color:#fff;">MC</div>
              <div>
                <div style="font-size:18px;font-weight:800;line-height:1.1;">MedCore</div>
                <div style="font-size:10px;opacity:0.85;letter-spacing:2px;">UMR SYSTEM</div>
              </div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a;font-weight:800;line-height:1.4;">${escapeHtml(title)}</h1>
            <p style="margin:0 0 18px;color:#475569;font-size:15px;line-height:1.7;white-space:pre-line;">${escapeHtml(message)}</p>
            ${safeLink ? `<div style="margin-top:24px;"><a href="${safeLink}" style="display:inline-block;background:${accent};color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:10px;font-size:14px;">عرض التفاصيل</a></div>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;line-height:1.6;">
            هذا إشعار آلي من منصة MedCore. لا ترد على هذا البريد.
            <br/>لإيقاف الإشعارات على البريد، افتح الإعدادات في حسابك.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Main API.
 * Returns the saved Notification document. Email send is fire-and-forget.
 */
async function notifyUser({ userId, title, message, type = "info", category = "account", link }) {
  if (!userId || !title || !message) {
    throw new Error("notifyUser requires userId, title, and message");
  }

  const validNotifTypes = ["otp", "info", "warning", "success"];
  const docType = validNotifTypes.includes(type) ? type : "info";

  // 1) Persist in DB (always)
  const doc = await Notification.create({
    userId,
    title,
    message,
    type: docType,
  });

  // 2) Email if user opted in
  ;(async () => {
    try {
      const user = await User.findById(userId).select("email notificationPrefs role").lean();
      if (!user || !user.email) return;

      const prefs = user.notificationPrefs || {};
      // Default master to true if not yet set
      if (prefs.emailEnabled === false) return;

      const prefKey = CATEGORY_TO_PREF[category];
      // If a per-category pref exists and is explicitly false, skip
      if (prefKey && prefs[prefKey] === false) return;

      const html = buildEmailHtml({ title, message, type, link });
      await sendNotificationEmail(user.email, title, html);
    } catch (e) {
      console.error("[notify] email send failed:", e.message);
    }
  })();

  return doc;
}

module.exports = { notifyUser };
