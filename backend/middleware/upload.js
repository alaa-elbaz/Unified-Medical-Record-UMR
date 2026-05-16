const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

/* =========================================================
   إعداد Multer مع Cloudinary - يُستخدم في labRoutes و radiologyRoutes
========================================================= */

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "medical/misc";
    const path = req.originalUrl || req.url || "";

    // ID / syndicate documents from registration land in their own
    // identity-document folder so admins can audit them separately and
    // they're not mixed with patient medical media.
    if (path.includes("/auth/register")) {
      folder = "identity/documents";
    } else if (path.includes("labs")) {
      folder = "medical/labs";
    } else if (path.includes("radiology")) {
      folder = "medical/radiology";
    } else if (path.includes("records") || path.includes("self-report")) {
      folder = "medical/records";
    } else if (path.includes("prescriptions")) {
      folder = "medical/prescriptions";
    }

    return {
      folder: folder,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"],
      type: "private",
      // resource_type defaults to "auto" which CloudinaryStorage v4 handles
      // correctly for both images and PDFs. Don't override.
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
