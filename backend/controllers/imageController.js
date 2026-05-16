const cloudinary = require("../config/cloudinary");
const MedicalRecord = require("../models/MedicalRecord");
const LabResult = require("../models/LabResult");
const Radiology = require("../models/Radiology");
const User = require("../models/User");

/**
 * Check if the requesting user is allowed to access an asset by publicId.
 *
 * Strategy: look up the publicId across the models that can reference uploaded
 * media (MedicalRecord, LabResult, Radiology, User identity docs). If we find a
 * matching document, we apply role-based ownership rules. If we don't find one,
 * we reject — better to fail closed than hand out signed URLs to anything.
 *
 * Returns { allowed: boolean, reason?: string }
 */
async function isAuthorizedForAsset(user, publicId) {
  if (!user || !publicId) return { allowed: false, reason: "missing user or publicId" };

  const role = user.role;
  const userId = String(user.userId || user._id || "");
  const orgId = user.orgId ? String(user.orgId) : null;

  // Privileged staff can access anything (admins).
  if (role === "super_admin" || role === "sub_admin") {
    return { allowed: true };
  }

  // Build a regex that matches the publicId with or without the file extension
  // since some models store full URLs and others store the bare publicId.
  const escapedId = publicId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(escapedId, "i");

  // 1) MedicalRecord match (filePath stores URL)
  const record = await MedicalRecord.findOne({ filePath: matcher })
    .select("patientId doctorId orgId")
    .lean();
  if (record) {
    const isPatient = role === "patient" && String(record.patientId) === userId;
    const isDoctor = role === "doctor" && String(record.doctorId || "") === userId;
    const isOrg = orgId && String(record.orgId || "") === orgId;
    if (isPatient || isDoctor || isOrg) return { allowed: true };
    return { allowed: false, reason: "not authorized for this medical record" };
  }

  // 2) LabResult match (filePath / files[])
  const lab = await LabResult.findOne({
    $or: [{ filePath: matcher }, { files: matcher }, { resultUrl: matcher }],
  })
    .select("patientId doctorId orgId labOrgId")
    .lean();
  if (lab) {
    const isPatient = role === "patient" && String(lab.patientId) === userId;
    const isDoctor = role === "doctor" && String(lab.doctorId || "") === userId;
    const isOrg =
      orgId &&
      (String(lab.orgId || "") === orgId || String(lab.labOrgId || "") === orgId);
    if (isPatient || isDoctor || isOrg) return { allowed: true };
    return { allowed: false, reason: "not authorized for this lab result" };
  }

  // 3) Radiology match (imagePath)
  const rad = await Radiology.findOne({ imagePath: matcher })
    .select("patientId doctorId orgId")
    .lean();
  if (rad) {
    const isPatient = role === "patient" && String(rad.patientId) === userId;
    const isDoctor = role === "doctor" && String(rad.doctorId || "") === userId;
    const isOrg = orgId && String(rad.orgId || "") === orgId;
    if (isPatient || isDoctor || isOrg) return { allowed: true };
    return { allowed: false, reason: "not authorized for this radiology image" };
  }

  // 4) User identity documents — only the owner (and admins above) can view
  const userDoc = await User.findOne({
    $or: [{ idDocumentPath: matcher }, { syndicateIdPath: matcher }],
  })
    .select("_id")
    .lean();
  if (userDoc) {
    if (String(userDoc._id) === userId) return { allowed: true };
    return { allowed: false, reason: "identity documents are owner-only" };
  }

  return { allowed: false, reason: "asset not found" };
}

exports.getSecureImage = async (req, res, next) => {
  try {
    // 1. استخراج الـ publicId أو الرابط
    const publicIdParam = req.params[0]; // Matches everything after /api/images/
    const urlQuery = req.query.url;

    let publicId = "";

    if (urlQuery) {
      // استخراج publicId من أي رابط Cloudinary (public, authenticated, private)
      const match = urlQuery.match(/(?:upload|authenticated\/?.*?|private\/?.*?)\/(?:v\d+\/)?(.+?)(?:\.[a-z]+)?$/i);
      if (match && match[1]) {
        publicId = match[1];
      } else {
        const parts = urlQuery.split("/");
        const filename = parts.pop().split(".")[0];
        const folder = parts.pop();
        publicId = `${folder}/${filename}`;
      }
    } else if (publicIdParam && publicIdParam !== "/") {
      publicId = publicIdParam;
      if (publicId.startsWith("/")) {
        publicId = publicId.substring(1);
      }
    }

    if (!publicId) {
      return res.status(400).json({ message: "Image identifier (url or publicId) is required" });
    }

    // 2. التحقق من صلاحيات المستخدم (Authorization level)
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 3. التحقق من ملكية المورد قبل توقيع الرابط (يمنع IDOR)
    const auth = await isAuthorizedForAsset(req.user, publicId);
    if (!auth.allowed) {
      return res.status(403).json({
        message: "Forbidden: you do not have access to this asset",
      });
    }

    // 4. إنشاء رابط آمن مؤقت (Private)
    const url = cloudinary.url(publicId, {
      type: "private",
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // صالح لمدة ساعة
    });

    res.json({ url });
  } catch (err) {
    console.error("Secure Image URL Error:", err);
    next(err);
  }
};
