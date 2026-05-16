const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const imageController = require("../controllers/imageController");

// المسار سيكون /api/images/secure أو /api/images/:publicId
router.get("/secure", auth, imageController.getSecureImage);
router.get("/*", auth, imageController.getSecureImage);

module.exports = router;
